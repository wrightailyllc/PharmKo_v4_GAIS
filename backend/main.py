"""
Flask backend for PharmKo - handles API secrets securely via Google Cloud Secret Manager
"""
import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from google.cloud import secretmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Cache for secrets to avoid repeated API calls
_secrets_cache = {}

def get_secret(secret_name: str, project_id: str = None) -> str:
    """
    Retrieve a secret from Google Cloud Secret Manager.
    
    Args:
        secret_name: Name of the secret (e.g., 'gemini-api-key')
        project_id: GCP project ID (defaults to environment variable)
    
    Returns:
        The secret value as a string
    """
    if not project_id:
        project_id = os.environ.get("GCP_PROJECT_ID")
        if not project_id:
            raise ValueError("GCP_PROJECT_ID environment variable not set")
    
    # Check cache first
    cache_key = f"{project_id}/{secret_name}"
    if cache_key in _secrets_cache:
        return _secrets_cache[cache_key]
    
    try:
        client = secretmanager.SecretManagerServiceClient()
        secret_path = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": secret_path})
        secret_value = response.payload.data.decode("UTF-8")
        
        # Cache the secret
        _secrets_cache[cache_key] = secret_value
        logger.info(f"Retrieved secret: {secret_name}")
        return secret_value
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {str(e)}")
        raise


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/secrets/gemini-key", methods=["GET"])
def get_gemini_key():
    """
    Endpoint for frontend to get Gemini API key.
    Frontend will make a request to this endpoint instead of storing the key directly.
    """
    try:
        api_key = get_secret("gemini-api-key")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving Gemini key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/secrets/fda-key", methods=["GET"])
def get_fda_key():
    """
    Endpoint for frontend to get FDA API key.
    """
    try:
        api_key = get_secret("fda-api-key")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving FDA key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/config", methods=["GET"])
def get_config():
    """
    Endpoint that provides safe, non-sensitive configuration to the frontend.
    Returns whether secrets are available and the backend is ready.
    """
    try:
        # Test that we can retrieve secrets
        get_secret("gemini-api-key")
        get_secret("fda-api-key")
        
        return jsonify({
            "ready": True,
            "message": "Backend is configured and secrets are accessible"
        }), 200
    except Exception as e:
        logger.error(f"Configuration check failed: {str(e)}")
        return jsonify({
            "ready": False,
            "message": "Backend is not properly configured"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)