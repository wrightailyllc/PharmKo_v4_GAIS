/**
 * Secret Manager Service
 * 
 * This service fetches API keys from the backend instead of storing them client-side.
 * The backend retrieves secrets from Google Cloud Secret Manager.
 */

// Cache for fetched secrets to avoid repeated API calls
const secretsCache: { [key: string]: string } = {};

declare const __VITE_BACKEND_URL__: string;
const BACKEND_URL = typeof __VITE_BACKEND_URL__ !== 'undefined' ? __VITE_BACKEND_URL__ : "";

async function fetchSecret(secretName: string): Promise<string> {
  // Return from cache if available
  if (secretsCache[secretName]) {
    return secretsCache[secretName];
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/secrets/${secretName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch secret: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.api_key) {
      // Cache the secret
      secretsCache[secretName] = data.api_key;
      return data.api_key;
    } else {
      throw new Error("No API key returned from backend");
    }
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

export async function getGeminiApiKey(): Promise<string> {
  return fetchSecret("gemini-key");
}

export async function getFdaApiKey(): Promise<string> {
  return fetchSecret("fda-key");
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
}

export async function checkBackendConfig(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.ready === true;
  } catch (error) {
    console.error("Backend config check failed:", error);
    return false;
  }
}
