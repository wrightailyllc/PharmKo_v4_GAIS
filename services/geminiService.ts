import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, SourceData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`;
  const data = await fetchApi(url, 'RxNorm API request failed');
  const rxcui = data?.idGroup?.rxnormId?.[0];
  if (!rxcui) throw new Error(`Could not find a valid RxCUI for "${drugName}".`);
  
  const ingredientUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=IN`;
  const ingredientData = await fetchApi(ingredientUrl, 'RxNorm ingredient lookup failed');
  const activeIngredient = ingredientData?.relatedGroup?.conceptGroup?.[0]?.conceptProperties?.[0]?.name || drugName;
  
  return { rxcui, activeIngredient };
};

const fetchFdaData = async (activeIngredient: string) => {
  const fdaApiKey = process.env.FDA_API_KEY;
  let labelUrl = `https://api.fda.gov/drug/label.json?search=openfda.substance_name:"${encodeURIComponent(activeIngredient)}"&limit=1`;
  let eventsUrl = `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.substance_name:"${encodeURIComponent(activeIngredient)}"&count=patient.reaction.reactionmeddrapt.exact&limit=50`;

  if (fdaApiKey) {
    labelUrl += `&api_key=${fdaApiKey}`;
    eventsUrl += `&api_key=${fdaApiKey}`;
  }
  
  const [fdaLabel, adverseEvents] = await Promise.all([
    fetchApi(labelUrl, 'FDA Label API returned an error'),
    fetchApi(eventsUrl, 'FDA Adverse Events API returned an error'),
  ]);

  return { fdaLabel, adverseEvents };
};

const fetchClinicalTrialsData = async (activeIngredient: string) => {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(activeIngredient)}&pageSize=50`;
  return await fetchApi(url, 'ClinicalTrials.gov API request failed');
};

const fetchPubmedData = async (activeIngredient: string) => {
  const email = process.env.PUBMED_EMAIL || 'info@example.com';
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=(${encodeURIComponent(activeIngredient)})+AND+(safety+OR+adverse+OR+risk)&retmax=200&sort=relevance&retmode=json&email=${email}`;
  return await fetchApi(url, 'PubMed API request failed');
};

const fetchEuropePmcData = async (activeIngredient: string) => {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=(${encodeURIComponent(activeIngredient)}) AND (SAFETY OR ADVERSE OR RISK)&resultType=lite&pageSize=200&format=json`;
  return await fetchApi(url, 'Europe PMC API request failed');
};


// --- Main Analysis Function ---

export const analyzeDrugSafety = async (
  drugName: string,
  updateLog: (message: string) => void
): Promise<{ analysisResult: AnalysisResult; sourceData: SourceData }> => {
  
  updateLog(`Identifying drug: ${drugName}...`);
  const { rxcui, activeIngredient } = await fetchRxNormData(drugName);
  const sourceData: SourceData = { rxcui, activeIngredient };

  updateLog(`Fetching data for ${activeIngredient} (RxCUI: ${rxcui})...`);
  const [
      { fdaLabel, adverseEvents },
      clinicalTrials,
      pubmedData,
      europePmcData,
  ] = await Promise.all([
      fetchFdaData(activeIngredient).then(data => { updateLog('✓ FDA data retrieved.'); return data; }),
      fetchClinicalTrialsData(activeIngredient).then(data => { updateLog('✓ ClinicalTrials.gov data retrieved.'); return data; }),
      fetchPubmedData(activeIngredient).then(data => { updateLog('✓ PubMed articles retrieved.'); return data; }),
      fetchEuropePmcData(activeIngredient).then(data => { updateLog('✓ Europe PMC articles retrieved.'); return data; }),
  ]);

  sourceData.fdaLabel = fdaLabel;
  sourceData.adverseEvents = adverseEvents;
  sourceData.clinicalTrials = clinicalTrials;
  sourceData.pubmedArticles = pubmedData;
  sourceData.europePmcArticles = europePmcData;

  updateLog('Synthesizing data with AI...');
  const prompt = `
      Analyze the provided pharmaceutical data for "${activeIngredient}". Generate a comprehensive, consumer-friendly report in JSON format.
      The report MUST strictly adhere to the provided JSON schema.
      - Drug Label Analysis: Summarize the drug's use. Explicitly state the black box warning if present. Identify other common drug names that use this active ingredient.
      - Clinical Trial Analysis: Summarize the findings. State the highest trial phase found (e.g., Phase 3, Phase 4) and list the primary medical conditions studied.
      - Adverse Effects Profile: Summarize the overall profile. Include the total number of adverse events found. Create pie chart data by calculating the percentage of each of the top adverse events. Group any event representing less than 5% of the total into a single "Other" category, UNLESS it is a serious event (e.g., involves death, disability), in which case it should be listed individually. Also, provide a separate simple list of the top 5 most frequent event terms.
      - Journal Article Analysis: Summarize the literature. Provide key findings. State the total number of articles reviewed and how many might be behind a paywall (assume any not providing a full abstract could be).
      - Drug Interactions: Summarize potential interactions based on the label data. List specific substances, their effects, and a severity level (e.g., High, Moderate, Low).
      - Potential Harm Score: Provide a brief summary and a numerical score from 1 (low) to 10 (high) representing the potential for harm based on all available data (warnings, AEs, etc.).
      - Citations: Provide two example citations for the most critical data points (e.g., the FDA label source, a key clinical trial).
      - All text MUST be formatted as Markdown.

      RAW DATA:
      - FDA Label: ${JSON.stringify(fdaLabel?.results?.[0]).substring(0, 4000)}
      - Adverse Events (FAERS): Total Reports: ${adverseEvents?.meta?.results?.total}. Top results: ${JSON.stringify(adverseEvents?.results).substring(0, 4000)}
      - Clinical Trials: ${JSON.stringify(clinicalTrials?.studies?.slice(0, 10)).substring(0, 4000)}
      - PubMed/EuropePMC Article Count: ${(pubmedData?.esearchresult?.count || 0) + (europePmcData?.hitCount || 0)}
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