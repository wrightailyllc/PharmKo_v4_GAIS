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
 *
 * BACKEND_BASE_URL resolution:
 * - Native app (Capacitor): always use absolute Cloud Run URL
 * - Web prod (same-origin Cloud Run): empty string → relative paths
 * - Web dev (vite): override via VITE_BACKEND_URL env var, fall back to localhost:5000
 */

const PRODUCTION_BACKEND = (import.meta.env.VITE_PRODUCTION_BACKEND as string | undefined) || 'https://pharmko-app-ujgphtntsq-uc.a.run.app';

const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // Capacitor 6+ schemes
  return window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' && window.location.protocol === 'https:' && !!cap;
};

export const getBackendBaseUrl = (): string => {
  if (isNativePlatform()) {
    const override = import.meta.env.VITE_BACKEND_URL as string | undefined;
    return override || PRODUCTION_BACKEND;
  }
  if (import.meta.env.PROD) {
    return '';
  }
  if (typeof window !== 'undefined') {
    const override = import.meta.env.VITE_BACKEND_URL as string | undefined;
    if (override) return override;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

export const BACKEND_BASE_URL = getBackendBaseUrl();

export const config = {
  apiEndpoints: {
    geminiProxy: `${BACKEND_BASE_URL}/api/proxy/analyze`,
    fdaProxy: `${BACKEND_BASE_URL}/api/proxy/fda/drug`,
    rxNorm: 'https://rxnav.nlm.nih.gov/REST',
    clinicalTrials: 'https://clinicaltrials.gov/api/v2/studies',
    europePmc: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  },
};
