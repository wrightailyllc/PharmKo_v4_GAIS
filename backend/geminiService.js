// backend/geminiService.js

const OpenAI = require("openai");

// Uses the OPENAI_API_KEY env var (set in Cloud Run from Secret Manager)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// FDA key from env
const fdaApiKey = process.env.FDA_API_KEY;

// ---------- Helper for fetch ----------

async function fetchApi(url, errorMessage) {
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
    throw new Error(
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ---------- API fetching functions ----------

async function fetchRxNormData(drugName) {
  const rxcuiUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(
    drugName
  )}&search=2`;

  const data = await fetchApi(rxcuiUrl, "RxNorm API request failed");
  const rxcui = data?.idGroup?.rxnormId?.[0];

  if (!rxcui) {
    throw new Error(`Could not find a valid RxCUI for "${drugName}".`);
  }

  const ingredientUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=IN`;
  const ingredientData = await fetchApi(
    ingredientUrl,
    "RxNorm ingredient lookup failed"
  );

  const activeIngredient =
    ingredientData?.relatedGroup?.conceptGroup?.[0]?.conceptProperties?.[0]?.name ||
    drugName;

  return {
    rxcui,
    activeIngredient,
    urls: {
      rxNormRxcui: rxcuiUrl,
      rxNormIngredient: ingredientUrl,
    },
  };
}

async function fetchFdaData(drugName, activeIngredient) {
  const fdaApiBase = "https://api.fda.gov/drug";
  const addApiKey = (url) => (fdaApiKey ? `${url}&api_key=${fdaApiKey}` : url);

  const labelSearchQuery = `(openfda.brand_name:"${encodeURIComponent(
    drugName
  )}" OR openfda.generic_name:"${encodeURIComponent(
    drugName
  )}" OR openfda.substance_name:"${encodeURIComponent(activeIngredient)}")`;

  const eventSearchQuery = `(patient.drug.openfda.brand_name:"${encodeURIComponent(
    drugName
  )}" OR patient.drug.openfda.generic_name:"${encodeURIComponent(
    drugName
  )}" OR patient.drug.openfda.substance_name:"${encodeURIComponent(
    activeIngredient
  )}")`;

  const labelUrl = addApiKey(
    `${fdaApiBase}/label.json?search=${labelSearchQuery}&limit=1`
  );
  const totalEventsUrl = addApiKey(
    `${fdaApiBase}/event.json?search=${eventSearchQuery}&count=safetyreportid.exact&limit=0`
  );
  const topReactionsUrl = addApiKey(
    `${fdaApiBase}/event.json?search=${eventSearchQuery}&count=patient.reaction.reactionmeddrapt.exact&limit=50`
  );

  const [fdaLabel, adverseEventsTotal, adverseEventsReactions] = await Promise.all([
    fetchApi(labelUrl, "FDA Label API returned an error"),
    fetchApi(totalEventsUrl, "FDA Adverse Events (Total) API returned an error"),
    fetchApi(topReactionsUrl, "FDA Adverse Events (Reactions) API returned an error"),
  ]);

  const combinedAdverseEvents = {
    meta: {
      results: { total: adverseEventsTotal?.meta?.results?.total || 0 },
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
    },
  };
}

async function fetchClinicalTrialsData(activeIngredient) {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(
    activeIngredient
  )}&pageSize=50`;
  const data = await fetchApi(url, "ClinicalTrials.gov API request failed");
  return { data, url };
}

async function fetchEuropePmcData(activeIngredient) {
  const safetyQuery = `(${encodeURIComponent(
    activeIngredient
  )}) AND (SAFETY OR ADVERSE OR RISK)`;
  let url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${safetyQuery}&resultType=core&pageSize=10&format=json`;
  let data = await fetchApi(url, "Europe PMC API request failed");

  if (!data || data.hitCount === 0) {
    const broadQuery = `(${encodeURIComponent(activeIngredient)})`;
    const broadUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${broadQuery}&resultType=core&pageSize=10&format=json`;
    data = await fetchApi(broadUrl, "Europe PMC API request failed");
    url = broadUrl;
  }

  return { data, url };
}

// ---------- Main analysis function (server-side) ----------

async function analyzeDrugSafety(drugName, updateLog) {
  updateLog(`Identifying drug: ${drugName}...`);

  const { rxcui, activeIngredient, urls: rxNormUrls } = await fetchRxNormData(drugName);
  const sourceData = { rxcui, activeIngredient };

  updateLog(`Fetching data for ${activeIngredient} (RxCUI: ${rxcui})...`);

  const [
    { fdaLabel, adverseEvents, urls: fdaUrls },
    { data: clinicalTrials, url: clinicalTrialsUrl },
    { data: europePmcData, url: europePmcUrl },
  ] = await Promise.all([
    fetchFdaData(drugName, activeIngredient).then((data) => {
      updateLog("✓ FDA data retrieved.");
      return data;
    }),
    fetchClinicalTrialsData(activeIngredient).then((data) => {
      updateLog("✓ ClinicalTrials.gov data retrieved.");
      return data;
    }),
    fetchEuropePmcData(activeIngredient).then((data) => {
      updateLog("✓ Europe PMC articles retrieved.");
      return data;
    }),
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
    ?.map((article) => article.abstractText)
    .filter(Boolean)
    .join("\n\n---\n\n");

  const articleAnalysisPrompt = articleAbstracts
    ? `Analyze the following abstracts from recent, relevant journal articles:\n${articleAbstracts}`
    : `No relevant journal articles with abstracts were found for detailed analysis. Note the potential implications of a lack of recent, specific safety literature in your summary.`;

  const totalArticleCount = europePmcData?.hitCount || 0;

  updateLog("Synthesizing data with AI...");

  const prompt = `
Analyze the provided pharmaceutical data for "${activeIngredient}". Generate a comprehensive, consumer-friendly report in JSON format matching the schema.
- Drug Label Analysis: Summarize the drug's use. Explicitly state the black box warning if present. Identify other common drug names that use this active ingredient.
- Clinical Trial Analysis: Summarize the findings. State the highest trial phase found and list the primary medical conditions studied.
- Adverse Effects Profile: Summarize the overall profile. Include the total number of adverse events found. Create pie chart data by calculating the percentage of each of the top adverse events. Group any event representing less than 5% of the total into "Other" unless it is serious (death, disability).
- Journal Article Analysis: Base your summary on the provided article abstracts. If no abstracts are provided, discuss the implications. State the total number of articles and estimate how many might be paywalled.
- Drug Interactions: Summarize potential interactions based on the label data.
- Potential Harm Score: Provide a brief summary and a numerical score from 1 (low) to 10 (high).
- Citations: Provide two example citations for critical data points (e.g., FDA label, key clinical trial).

RAW DATA:
- FDA Label: ${JSON.stringify(fdaLabel?.results?.[0]).substring(0, 4000)}
- Adverse Events (FAERS): Total Reports: ${
    adverseEvents.meta.results.total
  }. Top results: ${JSON.stringify(adverseEvents.results).substring(0, 4000)}
- Clinical Trials: ${JSON.stringify(clinicalTrials?.studies?.slice(0, 10)).substring(
    0,
    4000
  )}
- Total PubMed/EuropePMC Article Count: ${totalArticleCount}
- Journal Article Abstracts for Analysis: ${articleAnalysisPrompt.substring(0, 8000)}
`;

  // JSON schema for OpenAI Responses API
  const analysisResultSchema = {
    type: "object",
    properties: {
      drugLabelAnalysis: {
        type: "object",
        properties: {
          summary: { type: "string" },
          blackBoxWarning: { type: "string" },
          activeIngredient: { type: "string" },
          otherDrugsWithActiveIngredient: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "summary",
          "blackBoxWarning",
          "activeIngredient",
          "otherDrugsWithActiveIngredient",
        ],
      },
      clinicalTrialAnalysis: {
        type: "object",
        properties: {
          summary: { type: "string" },
          highestPhase: { type: "string" },
          conditionsStudied: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["summary", "highestPhase", "conditionsStudied"],
      },
      adverseEffectsProfile: {
        type: "object",
        properties: {
          summary: { type: "string" },
          totalEvents: { type: "number" },
          pieChartData: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
              },
              required: ["name", "value"],
            },
          },
          top5Events: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["summary", "totalEvents", "pieChartData", "top5Events"],
      },
      journalAnalysis: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keyFindings: {
            type: "array",
            items: { type: "string" },
          },
          articlesReviewed: { type: "number" },
          paywalledArticles: { type: "number" },
        },
        required: ["summary", "keyFindings", "articlesReviewed", "paywalledArticles"],
      },
      drugInteractions: {
        type: "object",
        properties: {
          summary: { type: "string" },
          interactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                substance: { type: "string" },
                effect: { type: "string" },
                severity: { type: "string" },
              },
              required: ["substance", "effect", "severity"],
            },
          },
        },
        required: ["summary", "interactions"],
      },
      potentialHarmScore: {
        type: "object",
        properties: {
          summary: { type: "string" },
          score: { type: "number" },
        },
        required: ["summary", "score"],
      },
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: { type: "string" },
            details: { type: "string" },
          },
          required: ["source", "details"],
        },
      },
    },
    required: [
      "drugLabelAnalysis",
      "clinicalTrialAnalysis",
      "adverseEffectsProfile",
      "journalAnalysis",
      "drugInteractions",
      "potentialHarmScore",
      "citations",
    ],
  };

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "DrugSafetyAnalysis",
        schema: analysisResultSchema,
        strict: true,
      },
    },
  });

  updateLog("✓ AI analysis complete.");

  const jsonText = response.output[0].content[0].text;
  const analysisResult = JSON.parse(jsonText);

  return { analysisResult, sourceData };
}

module.exports = { analyzeDrugSafety };
