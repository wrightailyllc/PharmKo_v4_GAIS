/**
 * Backend Health/Config Service
 *
 * Provides health and configuration checks for the backend.
 * Secret fetching has been removed -- all keyed API calls now go through
 * server-side proxy routes (/api/proxy/*) that inject keys automatically.
 */

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
}

export async function checkBackendConfig(): Promise<boolean> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return false;
    const data = await response.json();
    return data.ready === true;
  } catch (error) {
    console.error("Backend config check failed:", error);
    return false;
  }
}
