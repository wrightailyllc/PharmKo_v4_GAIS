"""
Flask backend for PharmKo - handles API secrets securely via Replit Secrets
"""
import os
import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)
CORS(app)

# Cache for secrets to avoid repeated lookups
_secrets_cache = {}

def get_secret(secret_name: str) -> str:
    """
    Retrieve a secret from environment variables (Replit Secrets).
    """
    if secret_name in _secrets_cache:
        return _secrets_cache[secret_name]
    
    secret_value = os.environ.get(secret_name)
    if not secret_value:
        raise ValueError(f"Secret '{secret_name}' not found in environment variables")
    
    _secrets_cache[secret_name] = secret_value
    logger.info(f"Retrieved secret: {secret_name}")
    return secret_value


# API Routes
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/secrets/gemini-key", methods=["GET"])
def get_gemini_key():
    """Get Gemini API key from environment"""
    try:
        api_key = get_secret("GEMINI_API_KEY")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving Gemini key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/secrets/fda-key", methods=["GET"])
def get_fda_key():
    """Get FDA API key from environment"""
    try:
        api_key = get_secret("FDA_API_KEY")
        return jsonify({"api_key": api_key}), 200
    except Exception as e:
        logger.error(f"Error retrieving FDA key: {str(e)}")
        return jsonify({"error": "Failed to retrieve API key"}), 500


@app.route("/api/config", methods=["GET"])
def get_config():
    """Check if backend is properly configured"""
    try:
        get_secret("GEMINI_API_KEY")
        get_secret("FDA_API_KEY")
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
    """
    Try a few common locations for the built React `dist` folder and return the first one that exists.
    Search order (most to least likely):
      - sibling `dist` next to the project root when main.py is inside `backend/` (../dist)
      - `dist` in the same directory as the running file (./dist)
      - `/app/dist` which is used inside the container
      - current working directory `./dist`
    Also supports overriding via STATIC_DIR env var.
    """
    # Explicit override
    env_override = os.environ.get("STATIC_DIR")
    if env_override:
        p = Path(env_override).resolve()
        logger.info(f"STATIC_DIR override set: {p}")
        return p

    app_dir = Path(__file__).resolve().parent
    candidates = [
        (app_dir.parent / "dist").resolve(),  # ../dist when main.py is in backend/
        (app_dir / "dist").resolve(),         # ./dist next to main.py
        Path("/app/dist").resolve(),          # container common path
        (Path.cwd() / "dist").resolve(),      # project root dist
    ]

    for c in candidates:
        try:
            if c.exists() and c.is_dir():
                logger.info(f"Using dist path: {c}")
                return c
        except Exception:
            continue

    # Fallback (not found)
    fallback = (app_dir.parent / "dist").resolve()
    logger.warning(f"No dist directory found in candidates, returning fallback: {fallback}")
    return fallback


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
    port = int(os.environ.get("BACKEND_PORT", 8000))
    dist_path = get_dist_path()
    
    if dist_path.exists():
        logger.info(f"Serving static files from: {dist_path}")
    else:
        logger.warning(f"Static directory not found at: {dist_path}")
    
    logger.info(f"Starting Flask app on localhost:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
