// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, SourceData } from '../types';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fdaApiKey = process.env.FDA_API_KEY;

// --- Helper Functions ---

const fetchApi = async (url: string, errorMessage: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Gracefully handle "Not Found" as no data
      }
      throw new Error(`${errorMessage}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- API Fetching Functions ---

const fetchRxNormData = async (drugName: string) => {
  const rxcuiUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`;
  const data = await fetchApi(rxcuiUrl, 'RxNorm API request failed');
  const rxcui = data?.idGroup?.rxnormId?.[0];
  if (!rxcui) throw new Error(`Could not find a valid RxCUI for "${drugName}".`);
  
  const ingredientUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=IN`;
  const ingredientData = await fetchApi(ingredientUrl, 'RxNorm ingredient lookup failed');
  const activeIngredient = ingredientData?.relatedGroup?.conceptGroup?.[0]?.conceptProperties?.[0]?.name || drugName;
  
  return { 
    rxcui, 
    activeIngredient, 
    urls: {
      rxNormRxcui: rxcuiUrl,
      rxNormIngredient: ingredientUrl,
    }
  };
};

const fetchFdaData = async (drugName: string, activeIngredient: string) => {
  const fdaApiBase = 'https://api.fda.gov/drug';
  const addApiKey = (url: string) => fdaApiKey ? `${url}&api_key=${fdaApiKey}` : url;

  // Build a more robust query that searches brand name, generic name, and substance name.
  // This is more likely to find results if one of the fields doesn't match perfectly.
  const labelSearchQuery = `(openfda.brand_name:"${encodeURIComponent(drugName)}" OR openfda.generic_name:"${encodeURIComponent(drugName)}" OR openfda.substance_name:"${encodeURIComponent(activeIngredient)}")`;
  const eventSearchQuery = `(patient.drug.openfda.brand_name:"${encodeURIComponent(drugName)}" OR patient.drug.openfda.generic_name:"${encodeURIComponent(drugName)}" OR patient.drug.openfda.substance_name:"${encodeURIComponent(activeIngredient)}")`;

  const labelUrl = addApiKey(`${fdaApiBase}/label.json?search=${labelSearchQuery}&limit=1`);
  const totalEventsUrl = addApiKey(`${fdaApiBase}/event.json?search=${eventSearchQuery}&count=safetyreportid.exact&limit=0`);
  const topReactionsUrl = addApiKey(`${fdaApiBase}/event.json?search=${eventSearchQuery}&count=patient.reaction.reactionmeddrapt.exact&limit=50`);

  const [fdaLabel, adverseEventsTotal, adverseEventsReactions] = await Promise.all([
    fetchApi(labelUrl, 'FDA Label API returned an error'),
    fetchApi(totalEventsUrl, 'FDA Adverse Events (Total) API returned an error'),
    fetchApi(topReactionsUrl, 'FDA Adverse Events (Reactions) API returned an error'),
  ]);

  const combinedAdverseEvents = {
    meta: {
      results: { total: adverseEventsTotal?.meta?.results?.total || 0 }
    },
    results: adverseEventsReactions?.results || [],
  };

  return { 
    fdaLabel, 
    adverseEvents: combinedAdverseEvents,
    urls: {
      fdaLabel: labelUrl,
      fdaAdverseEventsTotal: totalEventsUrl,
      fdaAdverseEventsReactions: topReactionsUrl,
    }
  };
};

const fetchClinicalTrialsData = async (activeIngredient: string) => {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(activeIngredient)}&pageSize=50`;
  const data = await fetchApi(url, 'ClinicalTrials.gov API request failed');
  return { data, url };
};

const fetchEuropePmcData = async (activeIngredient: string) => {
    const safetyQuery = `(${encodeURIComponent(activeIngredient)}) AND (SAFETY OR ADVERSE OR RISK)`;
    let url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${safetyQuery}&resultType=core&pageSize=10&format=json`;
    let data = await fetchApi(url, 'Europe PMC API request failed');

    if (!data || data.hitCount === 0) {
        const broadQuery = `(${encodeURIComponent(activeIngredient)})`;
        const broadUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${broadQuery}&resultType=core&pageSize=10&format=json`;
        data = await fetchApi(broadUrl, 'Europe PMC API request failed');
        url = broadUrl; // Update url to the one that was successful
    }

    return { data, url };
};


// --- Main Analysis Function ---

export const analyzeDrugSafety = async (
  drugName: string,
  updateLog: (message: string) => void
): Promise<{ analysisResult: AnalysisResult; sourceData: SourceData }> => {
  
  updateLog(`Identifying drug: ${drugName}...`);
  const { rxcui, activeIngredient, urls: rxNormUrls } = await fetchRxNormData(drugName);
  const sourceData: SourceData = { rxcui, activeIngredient };

  updateLog(`Fetching data for ${activeIngredient} (RxCUI: ${rxcui})...`);
  const [
      { fdaLabel, adverseEvents, urls: fdaUrls },
      { data: clinicalTrials, url: clinicalTrialsUrl },
      { data: europePmcData, url: europePmcUrl },
  ] = await Promise.all([
      fetchFdaData(drugName, activeIngredient).then(data => { updateLog('✓ FDA data retrieved.'); return data; }),
      fetchClinicalTrialsData(activeIngredient).then(data => { updateLog('✓ ClinicalTrials.gov data retrieved.'); return data; }),
      fetchEuropePmcData(activeIngredient).then(data => { updateLog('✓ Europe PMC articles retrieved.'); return data; }),
  ]);

  sourceData.fdaLabel = fdaLabel;
  sourceData.adverseEvents = adverseEvents;
  sourceData.clinicalTrials = clinicalTrials;
  sourceData.europePmcArticles = europePmcData;
  sourceData.apiUrls = {
    ...rxNormUrls,
    ...fdaUrls,
    clinicalTrials: clinicalTrialsUrl,
    europePmc: europePmcUrl,
  };

  const articleAbstracts = europePmcData?.resultList?.result
    ?.map((article: any) => article.abstractText)
    .filter(Boolean)
    .join('\n\n---\n\n');
  
  const articleAnalysisPrompt = articleAbstracts
    ? `Analyze the following abstracts from recent, relevant journal articles:\n${articleAbstracts}`
    : `No relevant journal articles with abstracts were found for detailed analysis. Note the potential implications of a lack of recent, specific safety literature in your summary.`;
  
  // Note: The PubMed call was removed for simplicity and to rely on EuropePMC which mirrors PubMed content.
  // We'll synthesize a count for the prompt to avoid major prompt changes.
  const totalArticleCount = europePmcData?.hitCount || 0;

  updateLog('Synthesizing data with AI...');
  const prompt = `
      Analyze the provided pharmaceutical data for "${activeIngredient}". Generate a comprehensive, consumer-friendly report in JSON format.
      The report MUST strictly adhere to the provided JSON schema.
      - Drug Label Analysis: Summarize the drug's use. Explicitly state the black box warning if present. Identify other common drug names that use this active ingredient.
      - Clinical Trial Analysis: Summarize the findings. State the highest trial phase found (e.g., Phase 3, Phase 4) and list the primary medical conditions studied.
      - Adverse Effects Profile: Summarize the overall profile. Include the total number of adverse events found. Create pie chart data by calculating the percentage of each of the top adverse events. Group any event representing less than 5% of the total into a single "Other" category, UNLESS it is a serious event (e.g., involves death, disability), in which case it should be listed individually. Also, provide a separate simple list of the top 5 most frequent event terms.
      - Journal Article Analysis: Base your summary on the provided article abstracts. Provide key findings from these specific articles. If no abstracts were provided, comment on the implications of that. State the total number of articles found across all databases and estimate how many might be behind a paywall (assume any not providing a full abstract could be).
      - Drug Interactions: Summarize potential interactions based on the label data. List specific substances, their effects, and a severity level (e.g., High, Moderate, Low).
      - Potential Harm Score: Provide a brief summary and a numerical score from 1 (low) to 10 (high) representing the potential for harm based on all available data (warnings, AEs, etc.).
      - Citations: Provide two example citations for the most critical data points (e.g., the FDA label source, a key clinical trial).
      - All text MUST be formatted as Markdown.

      RAW DATA:
      - FDA Label: ${JSON.stringify(fdaLabel?.results?.[0]).substring(0, 4000)}
      - Adverse Events (FAERS): Total Reports: ${adverseEvents.meta.results.total}. Top results: ${JSON.stringify(adverseEvents.results).substring(0, 4000)}
      - Clinical Trials: ${JSON.stringify(clinicalTrials?.studies?.slice(0, 10)).substring(0, 4000)}
      - Total PubMed/EuropePMC Article Count: ${totalArticleCount}
      - Journal Article Abstracts for Analysis: ${articleAnalysisPrompt.substring(0, 8000)}
  `;

  const analysisResultSchema = {
    type: Type.OBJECT,
    properties: {
        drugLabelAnalysis: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                blackBoxWarning: { type: Type.STRING },
                activeIngredient: { type: Type.STRING },
                otherDrugsWithActiveIngredient: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["summary", "blackBoxWarning", "activeIngredient", "otherDrugsWithActiveIngredient"],
        },
        clinicalTrialAnalysis: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                highestPhase: { type: Type.STRING },
                conditionsStudied: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["summary", "highestPhase", "conditionsStudied"],
        },
        adverseEffectsProfile: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                totalEvents: { type: Type.NUMBER },
                pieChartData: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } },
                        required: ["name", "value"],
                    },
                },
                top5Events: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["summary", "totalEvents", "pieChartData", "top5Events"],
        },
        journalAnalysis: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
                articlesReviewed: { type: Type.NUMBER },
                paywalledArticles: { type: Type.NUMBER },
            },
            required: ["summary", "keyFindings", "articlesReviewed", "paywalledArticles"],
        },
        drugInteractions: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                interactions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            substance: { type: Type.STRING },
                            effect: { type: Type.STRING },
                            severity: { type: Type.STRING },
                        },
                        required: ["substance", "effect", "severity"],
                    },
                },
            },
            required: ["summary", "interactions"],
        },
        potentialHarmScore: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                score: { type: Type.NUMBER },
            },
            required: ["summary", "score"],
        },
        citations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    source: { type: Type.STRING },
                    details: { type: Type.STRING },
                },
                required: ["source", "details"],
            },
        },
    },
    required: ["drugLabelAnalysis", "clinicalTrialAnalysis", "adverseEffectsProfile", "journalAnalysis", "drugInteractions", "potentialHarmScore", "citations"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisResultSchema,
      temperature: 0.1,
    },
  });

  updateLog('✓ AI analysis complete.');
  
  const jsonText = response.text.trim();
  const analysisResult: AnalysisResult = JSON.parse(jsonText);
  
  return { analysisResult, sourceData };
};
