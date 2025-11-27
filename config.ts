/**
 * ===================================================================
 * CONFIGURATION - API SECRETS NOW MANAGED VIA GOOGLE CLOUD SECRET MANAGER
 * ===================================================================
 * 
 * IMPORTANT: API keys are NO LONGER stored in this file.
 * 
 * Instead, they are now managed through:
 * 1. Google Cloud Secret Manager (stores the actual secrets)
 * 2. Python backend (retrieves secrets from Secret Manager)
 * 3. Frontend service (requests secrets from backend via secure API)
 * 
 * This approach ensures:
 * - Secrets are never exposed in the frontend code
 * - Secrets are never committed to version control
 * - Secrets are centrally managed and easily rotated
 * - The frontend has no direct access to API credentials
 * 
 * For local development:
 * 1. Set up the backend to run locally on port 5000
 * 2. Set VITE_BACKEND_URL=http://localhost:5000 in your .env.local
 * 3. The backend will attempt to fetch from Google Cloud Secret Manager
 *    If not available, you may need to set local environment variables instead
 */

export const config = {
  // Backend URL for secret retrieval (set via VITE_BACKEND_URL environment variable)
  backendUrl: 'http://localhost:5000', // Override in production via environment
  
  // These are NO LONGER credentials - they are configuration values
  apiEndpoints: {
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    fda: 'https://api.fda.gov/drug',
    rxNorm: 'https://rxnav.nlm.nih.gov/REST',
    clinicalTrials: 'https://clinicaltrials.gov/api/v2/studies',
    europePmc: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  },
};
