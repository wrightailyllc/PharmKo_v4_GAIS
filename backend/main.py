"""
Flask backend for PharmKo - handles API secrets securely via Google Cloud Secret Manager
"""
import os
import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from google.cloud import secretmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)
CORS(app)

# Cache for secrets to avoid repeated API calls
_secrets_cache = {}

def get_secret(secret_name: str, project_id: str = None) -> str:
    """
    Retrieve a secret from Google Cloud Secret Manager.
    """
    if not project_id:
        project_id = os.environ.get("GCP_PROJECT_ID")
        if not project_id:
            raise ValueError("GCP_PROJECT_ID environment variable not set")
    
    cache_key = f"{project_id}/{secret_name}"
    if cache_key in _secrets_cache:
        return _secrets_cache[cache_key]
    
    try:
        client = secretmanager.SecretManagerServiceClient()
        secret_path = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": secret_path})
        secret_value = response.payload.data.decode("UTF-8")
        _secrets_cache[cache_key] = secret_value
        logger.info(f"Retrieved secret: {secret_name}")
        return secret_value
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {str(e)}")
        raise


# API Routes
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/secrets/gemini-key", methods=["GET"])
def get_gemini_key():
    """Get Gemini API key from Secret Manager"""
    try:
        api_key = get_secret("gemini-api-key")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving Gemini key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/secrets/fda-key", methods=["GET"])
def get_fda_key():
    """Get FDA API key from Secret Manager"""
    try:
        api_key = get_secret("fda-api-key")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving FDA key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/config", methods=["GET"])
def get_config():
    """Check if backend is properly configured"""
    try:
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


# Static file serving - serve React app
def get_dist_path():
    """Get absolute path to dist folder"""
    app_dir = Path(__file__).parent
    dist_path = (app_dir.parent / "dist").resolve()
    return dist_path


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    """Serve React app and handle client-side routing"""
    # Skip API routes
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    
    dist_path = get_dist_path()
    
    # Try to serve the requested file
    if path:
        file_path = dist_path / path
        # Security: prevent directory traversal
        try:
            if file_path.resolve().is_relative_to(dist_path) and file_path.is_file():
                return send_file(str(file_path))
        except (ValueError, Exception):
            pass
    
    # Default to index.html for client-side routing
    index_file = dist_path / "index.html"
    if index_file.exists():
        return send_file(str(index_file))
    
    logger.error(f"index.html not found at {index_file}")
    return jsonify({"error": "Application not found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    dist_path = get_dist_path()
    
    if dist_path.exists():
        logger.info(f"Serving static files from: {dist_path}")
    else:
        logger.warning(f"Static directory not found at: {dist_path}")
    
    logger.info(f"Starting Flask app on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
