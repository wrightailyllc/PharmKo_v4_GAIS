/**
 * ===================================================================
 * CONFIGURATION - All keyed API calls go through backend proxy routes
 * ===================================================================
 *
 * API keys are NEVER sent to the browser. The backend injects keys
 * server-side via proxy routes:
 * - /api/proxy/analyze  -> Gemini API (POST)
 * - /api/proxy/fda/*    -> FDA API (GET, key auto-appended)
 *
 * Public APIs (RxNorm, ClinicalTrials, EuropePMC) are called directly
 * from the frontend since they require no API keys.
 */

export const config = {
  apiEndpoints: {
    geminiProxy: '/api/proxy/analyze',
    fdaProxy: '/api/proxy/fda/drug',
    rxNorm: 'https://rxnav.nlm.nih.gov/REST',
    clinicalTrials: 'https://clinicaltrials.gov/api/v2/studies',
    europePmc: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  },
};
