// services/geminiService.ts

import type { AnalysisResult, SourceData } from '../types';
import { config } from '../config';

// --- Scoring System Constants ---
const SCORING_WEIGHTS = {
  adverseEventsVolume: 0.25,    // 25% - Total FAERS adverse event reports
  severityOfEvents: 0.20,       // 20% - % of serious events (death, disability, etc.)
  clinicalTrialSupport: 0.15,   // 15% - Max phase reached (higher = safer)
  journalArticleSignals: 0.25,  // 25% - Article count + paywall ratio + keywords
  labelWarnings: 0.10,          // 10% - Black box warning present
  interactions: 0.05,           // 5% - Count + severity of interactions
};

// Serious event keywords for severity calculation
const SERIOUS_EVENT_KEYWORDS = [
  'death', 'died', 'fatal', 'mortality',
  'disability', 'disabled', 
  'suicide', 'suicidal',
  'heart attack', 'myocardial infarction', 'cardiac arrest',
  'cancer', 'carcinoma', 'tumor', 'malignant',
  'paralysis', 'paralyzed', 'paralysed'
];

// --- Scoring Calculation Functions ---

interface ScoreBreakdown {
  adverseEventsVolume: { score: number; value: number; maxValue: number };
  severityOfEvents: { score: number; value: number; percentage: number };
  clinicalTrialSupport: { score: number; phase: string; phaseNumber: number };
  journalArticleSignals: { score: number; hitCount: number; paywalledRatio: number };
  labelWarnings: { score: number; hasBlackBox: boolean; mentionsDeath: boolean };
  interactions: { score: number; count: number; highSeverityCount: number };
  totalScore: number;
  weightedBreakdown: { [key: string]: { weight: number; contribution: number } };
}

function calculateAdverseEventsVolumeScore(totalEvents: number): { score: number; value: number; maxValue: number } {
  // Scale: 0 events = 1, 100k+ events = 10
  const thresholds = [0, 100, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 150000];
  let score = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (totalEvents >= thresholds[i]) {
      score = i + 1;
    }
  }
  return { score: Math.min(score, 10), value: totalEvents, maxValue: 150000 };
}

function calculateSeverityScore(adverseEvents: any[]): { score: number; value: number; percentage: number } {
  if (!adverseEvents || adverseEvents.length === 0) {
    return { score: 1, value: 0, percentage: 0 };
  }
  
  let seriousCount = 0;
  let totalCount = 0;
  
  for (const event of adverseEvents) {
    const eventName = (event.term || '').toLowerCase();
    const count = event.count || 1;
    totalCount += count;
    
    for (const keyword of SERIOUS_EVENT_KEYWORDS) {
      if (eventName.includes(keyword)) {
        seriousCount += count;
        break;
      }
    }
  }
  
  const percentage = totalCount > 0 ? (seriousCount / totalCount) * 100 : 0;
  // Scale: 0% = 1, 50%+ = 10
  const score = Math.min(10, Math.max(1, Math.ceil(percentage / 5)));
  
  return { score, value: seriousCount, percentage };
}

function calculateClinicalTrialScore(clinicalTrials: any): { score: number; phase: string; phaseNumber: number } {
  // Higher phase = MORE established = LOWER risk
  // Phase 4 = 2, Phase 3 = 4, Phase 2 = 6, Phase 1 = 8, No trials = 10
  const studies = clinicalTrials?.studies || [];
  let maxPhase = 0;
  let phaseString = 'None';
  
  for (const study of studies) {
    const phase = study?.protocolSection?.designModule?.phases || [];
    for (const p of phase) {
      const phaseMatch = p.match(/PHASE(\d)/i);
      if (phaseMatch) {
        const phaseNum = parseInt(phaseMatch[1]);
        if (phaseNum > maxPhase) {
          maxPhase = phaseNum;
          phaseString = `Phase ${phaseNum}`;
        }
      }
    }
  }
  
  // Invert: higher phase = lower score (safer)
  const score = maxPhase === 0 ? 10 : Math.max(1, 10 - (maxPhase * 2));
  
  return { score, phase: phaseString, phaseNumber: maxPhase };
}

function calculateJournalScore(europePmcData: any): { score: number; hitCount: number; paywalledRatio: number } {
  const hitCount = europePmcData?.hitCount || 0;
  const results = europePmcData?.resultList?.result || [];
  
  // Count articles without full abstracts (likely paywalled)
  const paywalledCount = results.filter((r: any) => !r.abstractText).length;
  const paywalledRatio = results.length > 0 ? paywalledCount / results.length : 0;
  
  // More articles with safety concerns = higher score
  // Scale based on hit count and paywall ratio
  let score = 1;
  if (hitCount > 1000) score = 8;
  else if (hitCount > 500) score = 6;
  else if (hitCount > 100) score = 4;
  else if (hitCount > 10) score = 2;
  
  // Add penalty for high paywall ratio (less accessible information)
  score += Math.floor(paywalledRatio * 2);
  
  return { score: Math.min(10, score), hitCount, paywalledRatio };
}

function calculateLabelWarningScore(fdaLabel: any): { score: number; hasBlackBox: boolean; mentionsDeath: boolean } {
  const labelData = fdaLabel?.results?.[0] || {};
  const blackBoxWarning = labelData.boxed_warning || [];
  const warnings = labelData.warnings || [];
  
  const hasBlackBox = blackBoxWarning.length > 0 && blackBoxWarning[0]?.length > 0;
  const warningText = [...blackBoxWarning, ...warnings].join(' ').toLowerCase();
  const mentionsDeath = warningText.includes('death') || warningText.includes('fatal') || warningText.includes('mortality');
  
  let score = 1;
  if (hasBlackBox) {
    score = mentionsDeath ? 10 : 7;
  } else if (mentionsDeath) {
    score = 5;
  } else if (warnings.length > 0) {
    score = 3;
  }
  
  return { score, hasBlackBox, mentionsDeath };
}

function calculateInteractionScore(interactions: any[]): { score: number; count: number; highSeverityCount: number } {
  if (!interactions || interactions.length === 0) {
    return { score: 1, count: 0, highSeverityCount: 0 };
  }
  
  const count = interactions.length;
  const highSeverityCount = interactions.filter((i: any) => 
    (i.severity || '').toLowerCase() === 'high'
  ).length;
  
  // Base score on count and severity
  let score = Math.min(5, Math.ceil(count / 3));
  score += Math.min(5, highSeverityCount * 2);
  
  return { score: Math.min(10, Math.max(1, score)), count, highSeverityCount };
}

function calculateTotalHarmScore(
  adverseEvents: any,
  clinicalTrials: any,
  europePmcData: any,
  fdaLabel: any,
  interactions: any[]
): ScoreBreakdown {
  const aeVolumeResult = calculateAdverseEventsVolumeScore(adverseEvents?.meta?.results?.total || 0);
  const severityResult = calculateSeverityScore(adverseEvents?.results || []);
  const trialResult = calculateClinicalTrialScore(clinicalTrials);
  const journalResult = calculateJournalScore(europePmcData);
  const labelResult = calculateLabelWarningScore(fdaLabel);
  const interactionResult = calculateInteractionScore(interactions);
  
  const weightedBreakdown: { [key: string]: { weight: number; contribution: number } } = {
    'Adverse Events Volume': { 
      weight: SCORING_WEIGHTS.adverseEventsVolume, 
      contribution: aeVolumeResult.score * SCORING_WEIGHTS.adverseEventsVolume 
    },
    'Severity of Events': { 
      weight: SCORING_WEIGHTS.severityOfEvents, 
      contribution: severityResult.score * SCORING_WEIGHTS.severityOfEvents 
    },
    'Clinical Trial Support': { 
      weight: SCORING_WEIGHTS.clinicalTrialSupport, 
      contribution: trialResult.score * SCORING_WEIGHTS.clinicalTrialSupport 
    },
    'Journal Article Signals': { 
      weight: SCORING_WEIGHTS.journalArticleSignals, 
      contribution: journalResult.score * SCORING_WEIGHTS.journalArticleSignals 
    },
    'Label Warnings': { 
      weight: SCORING_WEIGHTS.labelWarnings, 
      contribution: labelResult.score * SCORING_WEIGHTS.labelWarnings 
    },
    'Drug Interactions': { 
      weight: SCORING_WEIGHTS.interactions, 
      contribution: interactionResult.score * SCORING_WEIGHTS.interactions 
    },
  };
  
  const totalScore = Object.values(weightedBreakdown).reduce((sum, item) => sum + item.contribution, 0);
  
  return {
    adverseEventsVolume: aeVolumeResult,
    severityOfEvents: severityResult,
    clinicalTrialSupport: trialResult,
    journalArticleSignals: journalResult,
    labelWarnings: labelResult,
    interactions: interactionResult,
    totalScore: Math.round(totalScore * 10) / 10,
    weightedBreakdown,
  };
}

// --- Helper Functions ---

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('pharmko_session_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const isInternalUrl = (url: string): boolean =>
  url.startsWith('/') || url.startsWith(window.location.origin);

const fetchApi = async (url: string, errorMessage: string) => {
  try {
    const headers = isInternalUrl(url) ? getAuthHeaders() : {};
    const response = await fetch(url, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`${errorMessage}: ${response.status}`);
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
  const fdaProxyBase = config.apiEndpoints.fdaProxy;

  // Build a more robust query that searches brand name, generic name, and substance name.
  // This is more likely to find results if one of the fields doesn't match perfectly.
  const labelSearchQuery = `(openfda.brand_name:"${encodeURIComponent(drugName)}" OR openfda.generic_name:"${encodeURIComponent(drugName)}" OR openfda.substance_name:"${encodeURIComponent(activeIngredient)}")`;
  const eventSearchQuery = `(patient.drug.openfda.brand_name:"${encodeURIComponent(drugName)}" OR patient.drug.openfda.generic_name:"${encodeURIComponent(drugName)}" OR patient.drug.openfda.substance_name:"${encodeURIComponent(activeIngredient)}")`;

  // No api_key parameter needed -- the proxy injects it server-side
  const labelUrl = `${fdaProxyBase}/label.json?search=${labelSearchQuery}&limit=1`;
  const totalEventsUrl = `${fdaProxyBase}/event.json?search=${eventSearchQuery}&limit=1`;
  const topReactionsUrl = `${fdaProxyBase}/event.json?search=${eventSearchQuery}&count=patient.reaction.reactionmeddrapt.exact&limit=50`;

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
      - Drug Interactions: Summarize potential interactions based on the label data. List specific substances, their effects, and a severity level (e.g., High, Moderate, Low). Be thorough in identifying all interactions mentioned.
      - Potential Harm Score: DO NOT calculate the score yourself. The score will be calculated programmatically. Just provide a brief narrative summary of the overall safety profile based on the data.
      - Citations: Provide two example citations for the most critical data points (e.g., the FDA label source, a key clinical trial).
      - All text MUST be formatted as Markdown.

      RAW DATA:
      - FDA Label: ${JSON.stringify(fdaLabel?.results?.[0]).substring(0, 10000)}
      - Adverse Events (FAERS): Total Reports: ${adverseEvents.meta.results.total}. Top results: ${JSON.stringify(adverseEvents.results).substring(0, 10000)}
      - Clinical Trials: ${JSON.stringify(clinicalTrials?.studies?.slice(0, 10)).substring(0, 10000)}
      - Total PubMed/EuropePMC Article Count: ${totalArticleCount}
      - Journal Article Abstracts for Analysis: ${articleAnalysisPrompt.substring(0, 8000)}
  `;

  const analysisResultSchema = {
    type: "OBJECT",
    properties: {
        drugLabelAnalysis: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                blackBoxWarning: { type: "STRING" },
                activeIngredient: { type: "STRING" },
                otherDrugsWithActiveIngredient: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["summary", "blackBoxWarning", "activeIngredient", "otherDrugsWithActiveIngredient"],
        },
        clinicalTrialAnalysis: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                highestPhase: { type: "STRING" },
                conditionsStudied: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["summary", "highestPhase", "conditionsStudied"],
        },
        adverseEffectsProfile: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                totalEvents: { type: "NUMBER" },
                pieChartData: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { name: { type: "STRING" }, value: { type: "NUMBER" } },
                        required: ["name", "value"],
                    },
                },
                top5Events: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["summary", "totalEvents", "pieChartData", "top5Events"],
        },
        journalAnalysis: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                keyFindings: { type: "ARRAY", items: { type: "STRING" } },
                articlesReviewed: { type: "NUMBER" },
                paywalledArticles: { type: "NUMBER" },
            },
            required: ["summary", "keyFindings", "articlesReviewed", "paywalledArticles"],
        },
        drugInteractions: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                interactions: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            substance: { type: "STRING" },
                            effect: { type: "STRING" },
                            severity: { type: "STRING" },
                        },
                        required: ["substance", "effect", "severity"],
                    },
                },
            },
            required: ["summary", "interactions"],
        },
        potentialHarmScore: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
            },
            required: ["summary"],
        },
        citations: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    source: { type: "STRING" },
                    details: { type: "STRING" },
                },
                required: ["source", "details"],
            },
        },
    },
    required: ["drugLabelAnalysis", "clinicalTrialAnalysis", "adverseEffectsProfile", "journalAnalysis", "drugInteractions", "potentialHarmScore", "citations"],
  };

  // Call Gemini via server-side proxy (keys injected on the backend)
  const proxyResponse = await fetch(config.apiEndpoints.geminiProxy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      prompt: prompt,
      response_schema: analysisResultSchema,
    }),
  });

  if (!proxyResponse.ok) {
    const errorData = await proxyResponse.json().catch(() => ({}));
    throw new Error(errorData.error || 'Analysis temporarily unavailable');
  }

  const geminiResponse = await proxyResponse.json();

  updateLog('✓ AI analysis complete.');

  const jsonText = (geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  let aiResult;
  try {
    aiResult = JSON.parse(jsonText);
  } catch {
    throw new Error('Failed to parse AI analysis response. Please try again.');
  }
  
  // Calculate the harm score programmatically using the weighted scoring system
  updateLog('Calculating harm score...');
  const scoreBreakdown = calculateTotalHarmScore(
    adverseEvents,
    clinicalTrials,
    europePmcData,
    fdaLabel,
    aiResult.drugInteractions?.interactions || []
  );
  
  // Build the enhanced analysis result with calculated score
  const analysisResult: AnalysisResult = {
    ...aiResult,
    potentialHarmScore: {
      summary: aiResult.potentialHarmScore?.summary || '',
      score: scoreBreakdown.totalScore,
      scoreBreakdown: {
        adverseEventsVolume: {
          score: scoreBreakdown.adverseEventsVolume.score,
          weight: SCORING_WEIGHTS.adverseEventsVolume,
          contribution: scoreBreakdown.weightedBreakdown['Adverse Events Volume'].contribution,
          details: `${scoreBreakdown.adverseEventsVolume.value.toLocaleString()} total FAERS reports`
        },
        severityOfEvents: {
          score: scoreBreakdown.severityOfEvents.score,
          weight: SCORING_WEIGHTS.severityOfEvents,
          contribution: scoreBreakdown.weightedBreakdown['Severity of Events'].contribution,
          details: `${scoreBreakdown.severityOfEvents.percentage.toFixed(1)}% serious events (death, disability, etc.)`
        },
        clinicalTrialSupport: {
          score: scoreBreakdown.clinicalTrialSupport.score,
          weight: SCORING_WEIGHTS.clinicalTrialSupport,
          contribution: scoreBreakdown.weightedBreakdown['Clinical Trial Support'].contribution,
          details: `Highest phase: ${scoreBreakdown.clinicalTrialSupport.phase}`
        },
        journalArticleSignals: {
          score: scoreBreakdown.journalArticleSignals.score,
          weight: SCORING_WEIGHTS.journalArticleSignals,
          contribution: scoreBreakdown.weightedBreakdown['Journal Article Signals'].contribution,
          details: `${scoreBreakdown.journalArticleSignals.hitCount.toLocaleString()} articles, ${(scoreBreakdown.journalArticleSignals.paywalledRatio * 100).toFixed(0)}% paywalled`
        },
        labelWarnings: {
          score: scoreBreakdown.labelWarnings.score,
          weight: SCORING_WEIGHTS.labelWarnings,
          contribution: scoreBreakdown.weightedBreakdown['Label Warnings'].contribution,
          details: scoreBreakdown.labelWarnings.hasBlackBox 
            ? `Black box warning present${scoreBreakdown.labelWarnings.mentionsDeath ? ' (mentions death)' : ''}`
            : 'No black box warning'
        },
        interactions: {
          score: scoreBreakdown.interactions.score,
          weight: SCORING_WEIGHTS.interactions,
          contribution: scoreBreakdown.weightedBreakdown['Drug Interactions'].contribution,
          details: `${scoreBreakdown.interactions.count} interactions, ${scoreBreakdown.interactions.highSeverityCount} high severity`
        }
      }
    }
  };
  
  updateLog('✓ Score calculation complete.');
  
  return { analysisResult, sourceData };
};
