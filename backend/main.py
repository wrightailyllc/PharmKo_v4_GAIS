"""
Flask backend for PharmKo - handles API secrets securely via Replit Secrets
Includes Google Cloud Storage, Cloud SQL integration, and User Authentication
"""
import os
import logging
import atexit
from pathlib import Path
from functools import wraps
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)
CORS(app, supports_credentials=True)

# Import Google Cloud services (optional - only if configured)
try:
    from gcloud_services import (
        upload_file, upload_from_string, download_file, download_as_string,
        list_blobs, delete_blob, generate_signed_url,
        execute_query, execute_write, test_sql_connection, cleanup,
        is_configured as gcloud_is_configured,
        is_storage_configured as gcloud_storage_configured,
        is_sql_configured as gcloud_sql_configured,
        initialize_cache_table, get_cached_query, save_query_cache, detect_significant_changes
    )
    GCLOUD_MODULE_LOADED = True
    atexit.register(cleanup)
    logger.info("Google Cloud services module loaded")
    # Initialize cache table on startup
    initialize_cache_table()
except ImportError as e:
    GCLOUD_MODULE_LOADED = False
    gcloud_is_configured = lambda: False
    gcloud_storage_configured = lambda: False
    gcloud_sql_configured = lambda: False
    logger.warning(f"Google Cloud services not available: {e}")

def is_gcloud_available():
    """Check if Google Cloud is both loaded and properly configured"""
    return GCLOUD_MODULE_LOADED and gcloud_is_configured()

def is_gcloud_storage_available():
    """Check if Google Cloud Storage is available"""
    return GCLOUD_MODULE_LOADED and gcloud_storage_configured()

def is_gcloud_sql_available():
    """Check if Google Cloud SQL is available"""
    return GCLOUD_MODULE_LOADED and gcloud_sql_configured()

# Import Authentication service
AUTH_SERVICE = None
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() == "true"

try:
    from auth_service import get_auth_service, initialize_auth
    AUTH_SERVICE = get_auth_service()
    if AUTH_SERVICE and is_gcloud_sql_available():
        initialize_auth()
        logger.info("Authentication service initialized")
except ImportError as e:
    logger.warning(f"Authentication service not available: {e}")

def require_auth(f):
    """Decorator to require authentication for endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not AUTH_ENABLED:
            return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(' ')[1]
        if AUTH_SERVICE:
            user = AUTH_SERVICE.get_user_by_session(token)
            if not user:
                return jsonify({"error": "Invalid or expired session"}), 401
            request.current_user = user
        
        return f(*args, **kwargs)
    return decorated_function

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
        
        google_oauth_configured = bool(os.environ.get("GOOGLE_OAUTH_CLIENT_ID"))
        facebook_oauth_configured = bool(os.environ.get("FACEBOOK_APP_ID"))
        
        return jsonify({
            "ready": True,
            "message": "Backend is configured and secrets are accessible",
            "gcloud": {
                "storage_available": is_gcloud_storage_available(),
                "sql_available": is_gcloud_sql_available()
            },
            "caching_enabled": is_gcloud_sql_available(),
            "auth": {
                "enabled": AUTH_ENABLED,
                "google_oauth": google_oauth_configured,
                "facebook_oauth": facebook_oauth_configured,
                "database_ready": is_gcloud_sql_available()
            }
        }), 200
    except Exception as e:
        logger.error(f"Configuration check failed: {str(e)}")
        return jsonify({
            "ready": False,
            "message": "Backend is not properly configured",
            "gcloud": {
                "storage_available": is_gcloud_storage_available(),
                "sql_available": is_gcloud_sql_available()
            },
            "caching_enabled": is_gcloud_sql_available(),
            "auth": {
                "enabled": AUTH_ENABLED,
                "google_oauth": False,
                "facebook_oauth": False,
                "database_ready": is_gcloud_sql_available()
            }
        }), 500


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    """Check authentication status and configuration"""
    return jsonify({
        "auth_enabled": AUTH_ENABLED,
        "google_oauth_configured": bool(os.environ.get("GOOGLE_OAUTH_CLIENT_ID")),
        "facebook_oauth_configured": bool(os.environ.get("FACEBOOK_APP_ID")),
        "database_ready": is_gcloud_sql_available()
    }), 200


@app.route("/api/auth/toggle", methods=["POST"])
def toggle_auth():
    """Toggle authentication on/off (admin function)"""
    global AUTH_ENABLED
    try:
        data = request.get_json()
        enabled = data.get("enabled", True)
        AUTH_ENABLED = enabled
        if AUTH_SERVICE:
            AUTH_SERVICE.set_auth_enabled(enabled)
        return jsonify({
            "success": True,
            "auth_enabled": AUTH_ENABLED
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register new user with email/password"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        username = data.get("username")
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        result = AUTH_SERVICE.register_email(email, password, username)
        if result["success"]:
            return jsonify(result), 201
        return jsonify(result), 400
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login with email/password"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        result = AUTH_SERVICE.login_email(email, password)
        if result["success"]:
            return jsonify(result), 200
        return jsonify(result), 401
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/google", methods=["GET"])
def google_auth():
    """Get Google OAuth authorization URL"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    redirect_uri = request.args.get("redirect_uri")
    if not redirect_uri:
        dev_domain = os.environ.get("REPLIT_DEV_DOMAIN", "")
        redirect_uri = f"https://{dev_domain}/auth/google/callback" if dev_domain else None
    
    auth_url = AUTH_SERVICE.get_google_auth_url(redirect_uri)
    if auth_url:
        return jsonify({"auth_url": auth_url}), 200
    return jsonify({"error": "Google OAuth not configured"}), 503


@app.route("/api/auth/google/callback", methods=["POST"])
def google_callback():
    """Handle Google OAuth callback"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    try:
        data = request.get_json()
        code = data.get("code")
        redirect_uri = data.get("redirect_uri")
        
        if not code:
            return jsonify({"error": "Authorization code required"}), 400
        
        result = AUTH_SERVICE.login_google(code, redirect_uri)
        if result["success"]:
            return jsonify(result), 200
        return jsonify(result), 401
    except Exception as e:
        logger.error(f"Google callback error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/facebook/callback", methods=["POST"])
def facebook_callback():
    """Handle Facebook OAuth callback"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    try:
        data = request.get_json()
        access_token = data.get("access_token")
        
        if not access_token:
            return jsonify({"error": "Access token required"}), 400
        
        result = AUTH_SERVICE.login_facebook(access_token)
        if result["success"]:
            return jsonify(result), 200
        return jsonify(result), 401
    except Exception as e:
        logger.error(f"Facebook callback error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Logout user"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        AUTH_SERVICE.logout(token)
    
    return jsonify({"success": True}), 200


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current user profile"""
    return jsonify({
        "success": True,
        "user": request.current_user
    }), 200


@app.route("/api/auth/profile", methods=["PUT"])
@require_auth
def update_profile():
    """Update user profile"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    try:
        data = request.get_json()
        user_id = request.current_user.get("id")
        
        result = AUTH_SERVICE.update_profile(user_id, data)
        if result["success"]:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/users", methods=["GET"])
def list_users():
    """List all users (admin function)"""
    if not AUTH_SERVICE:
        return jsonify({"error": "Authentication service not available"}), 503
    
    users = AUTH_SERVICE.get_all_users()
    return jsonify({"users": users}), 200


@app.route("/api/analysis/cached", methods=["POST"])
def analyze_with_cache():
    """
    Analyze drug with intelligent query caching.
    Reuses results from last 30 days, only updates on significant changes.
    """
    try:
        data = request.get_json()
        drug_name = data.get("drug_name")
        
        if not drug_name:
            return jsonify({"error": "drug_name is required"}), 400
        
        if not is_gcloud_sql_available():
            return jsonify({"error": "Query caching requires Cloud SQL"}), 503
        
        # Check for existing cache
        cached = get_cached_query(drug_name)
        if cached and cached.get("cache_hit"):
            return jsonify({
                "status": "cache_hit",
                "cache_age_days": cached.get("days_old"),
                "results": cached.get("results"),
                "adverse_events_count": cached.get("adverse_events_count"),
                "journal_articles_count": cached.get("journal_articles_count"),
                "message": f"Returned cached results from {cached.get('days_old')} days ago"
            }), 200
        
        # If we get here, either no cache or older than 30 days
        # For older cache, the frontend would fetch new data, then send it back
        # This endpoint just manages the caching logic
        return jsonify({
            "status": "no_cache",
            "message": "No valid cache found. Frontend should fetch fresh data."
        }), 200
    
    except Exception as e:
        logger.error(f"Cache analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analysis/save-cache", methods=["POST"])
def save_analysis_cache():
    """
    Save analysis results to cache.
    Called after frontend completes analysis.
    """
    try:
        data = request.get_json()
        drug_name = data.get("drug_name")
        results = data.get("results")
        old_results = data.get("old_results")
        
        if not drug_name or not results:
            return jsonify({"error": "drug_name and results are required"}), 400
        
        if not is_gcloud_sql_available():
            return jsonify({"error": "Query caching requires Cloud SQL"}), 503
        
        # Count adverse events and articles
        adverse_count = len(results.get("adverseEventsData", {}).get("events", []))
        articles_count = len(results.get("journalArticles", []))
        
        # Check for significant changes if old_results provided
        significance = None
        if old_results:
            significance = detect_significant_changes(old_results, results)
        
        # Save to cache
        save_query_cache(
            drug_name=drug_name,
            results=results,
            adverse_events_count=adverse_count,
            journal_articles_count=articles_count
        )
        
        return jsonify({
            "status": "saved",
            "message": f"Cached results for {drug_name}",
            "adverse_events_count": adverse_count,
            "journal_articles_count": articles_count,
            "significance": significance
        }), 200
    
    except Exception as e:
        logger.error(f"Cache save error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# GOOGLE CLOUD STORAGE ENDPOINTS
# ============================================================

@app.route("/api/gcloud/storage/upload", methods=["POST"])
def gcloud_upload():
    """Upload a file to Google Cloud Storage"""
    if not is_gcloud_storage_available():
        return jsonify({"error": "Google Cloud Storage not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON and GCS_BUCKET_NAME secrets."}), 503
    
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        destination = request.form.get('destination', file.filename)
        make_public = request.form.get('make_public', 'false').lower() == 'true'
        
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            file.save(tmp.name)
            result = upload_file(
                tmp.name, 
                destination, 
                content_type=file.content_type,
                make_public=make_public
            )
            os.unlink(tmp.name)
        
        return jsonify({
            "success": True,
            **result
        }), 200
    except Exception as e:
        logger.error(f"GCS upload error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/gcloud/storage/list", methods=["GET"])
def gcloud_list_files():
    """List files in Google Cloud Storage bucket"""
    if not is_gcloud_storage_available():
        return jsonify({"error": "Google Cloud Storage not configured"}), 503
    
    try:
        prefix = request.args.get('prefix', None)
        max_results = int(request.args.get('max_results', 100))
        
        files = list_blobs(prefix=prefix, max_results=max_results)
        return jsonify({
            "success": True,
            "files": files,
            "count": len(files)
        }), 200
    except Exception as e:
        logger.error(f"GCS list error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/gcloud/storage/delete", methods=["DELETE"])
def gcloud_delete_file():
    """Delete a file from Google Cloud Storage"""
    if not is_gcloud_storage_available():
        return jsonify({"error": "Google Cloud Storage not configured"}), 503
    
    try:
        blob_name = request.args.get('name')
        if not blob_name:
            return jsonify({"error": "File name required"}), 400
        
        delete_blob(blob_name)
        return jsonify({
            "success": True,
            "deleted": blob_name
        }), 200
    except Exception as e:
        logger.error(f"GCS delete error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/gcloud/storage/signed-url", methods=["GET"])
def gcloud_signed_url():
    """Generate a signed URL for temporary file access"""
    if not is_gcloud_storage_available():
        return jsonify({"error": "Google Cloud Storage not configured"}), 503
    
    try:
        blob_name = request.args.get('name')
        if not blob_name:
            return jsonify({"error": "File name required"}), 400
        
        hours = int(request.args.get('hours', 24))
        method = request.args.get('method', 'GET')
        
        url = generate_signed_url(blob_name, expiration_hours=hours, method=method)
        return jsonify({
            "success": True,
            "signed_url": url,
            "expires_in_hours": hours
        }), 200
    except Exception as e:
        logger.error(f"GCS signed URL error: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# GOOGLE CLOUD SQL ENDPOINTS
# ============================================================

@app.route("/api/gcloud/sql/test", methods=["GET"])
def gcloud_sql_test():
    """Test Cloud SQL connection"""
    if not is_gcloud_sql_available():
        return jsonify({"error": "Google Cloud SQL not configured. Set CLOUD_SQL_INSTANCE, CLOUD_SQL_USER, CLOUD_SQL_PASSWORD, CLOUD_SQL_DATABASE secrets."}), 503
    
    try:
        result = test_sql_connection()
        return jsonify(result), 200 if result.get("connected") else 500
    except Exception as e:
        logger.error(f"Cloud SQL test error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/gcloud/sql/query", methods=["POST"])
def gcloud_sql_query():
    """Execute a SELECT query on Cloud SQL"""
    if not is_gcloud_sql_available():
        return jsonify({"error": "Google Cloud SQL not configured"}), 503
    
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({"error": "Query required"}), 400
        
        query = data['query']
        params = data.get('params', {})
        
        if any(kw in query.upper() for kw in ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER']):
            return jsonify({"error": "Only SELECT queries allowed via this endpoint"}), 403
        
        results = execute_query(query, params)
        return jsonify({
            "success": True,
            "results": results,
            "count": len(results)
        }), 200
    except Exception as e:
        logger.error(f"Cloud SQL query error: {e}")
        return jsonify({"error": str(e)}), 500


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
    is_production = os.environ.get("REPL_DEPLOYMENT", "false").lower() == "true"
    
    if is_production:
        port = 5000
        host = "0.0.0.0"
    else:
        port = int(os.environ.get("BACKEND_PORT", 8000))
        host = "127.0.0.1"
    
    dist_path = get_dist_path()
    
    if dist_path.exists():
        logger.info(f"Serving static files from: {dist_path}")
    else:
        logger.warning(f"Static directory not found at: {dist_path}")
    
    logger.info(f"Starting Flask app on {host}:{port} (production: {is_production})")
    app.run(host=host, port=port, debug=False)
