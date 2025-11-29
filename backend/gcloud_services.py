"""
Google Cloud Services Module for PharmKo
Provides integration with Google Cloud Storage and Cloud SQL
"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import timedelta

logger = logging.getLogger(__name__)

# Google Cloud clients (initialized lazily)
_storage_client = None
_sql_connector = None
_sql_engine = None
_credentials = None
_temp_creds_file = None


def _get_credentials():
    """
    Get Google Cloud credentials from environment.
    Uses in-memory credentials when possible for security.
    """
    global _credentials
    
    if _credentials is not None:
        return _credentials
    
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    
    if creds_json:
        from google.oauth2 import service_account
        creds_dict = json.loads(creds_json)
        _credentials = service_account.Credentials.from_service_account_info(creds_dict)
        logger.info("Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON (in-memory)")
        return _credentials
    elif creds_file and os.path.exists(creds_file):
        from google.oauth2 import service_account
        _credentials = service_account.Credentials.from_service_account_file(creds_file)
        logger.info(f"Loaded credentials from file: {creds_file}")
        return _credentials
    else:
        raise ValueError(
            "Google Cloud credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON "
            "(JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path)"
        )


def is_storage_configured() -> bool:
    """Check if Google Cloud Storage is properly configured"""
    try:
        creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        if not (creds_json or (creds_file and os.path.exists(creds_file))):
            logger.debug("No Google Cloud credentials configured")
            return False
        
        bucket_name = os.environ.get("GCS_BUCKET_NAME")
        if not bucket_name:
            logger.debug("GCS_BUCKET_NAME not set - storage not available")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Storage configuration check failed: {e}")
        return False


def is_sql_configured() -> bool:
    """Check if Google Cloud SQL is properly configured"""
    try:
        creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        if not (creds_json or (creds_file and os.path.exists(creds_file))):
            return False
        
        instance = os.environ.get("CLOUD_SQL_INSTANCE")
        user = os.environ.get("CLOUD_SQL_USER")
        password = os.environ.get("CLOUD_SQL_PASSWORD")
        database = os.environ.get("CLOUD_SQL_DATABASE")
        
        if not all([instance, user, password, database]):
            logger.debug("Cloud SQL not fully configured - missing required env vars")
            return False
        
        return True
    except Exception as e:
        logger.error(f"SQL configuration check failed: {e}")
        return False


def is_configured() -> bool:
    """Check if any Google Cloud service is properly configured"""
    return is_storage_configured() or is_sql_configured()


# ============================================================
# GOOGLE CLOUD STORAGE (GCS)
# ============================================================

def get_storage_client():
    """Get or create Google Cloud Storage client"""
    global _storage_client
    if _storage_client is None:
        credentials = _get_credentials()
        from google.cloud import storage
        _storage_client = storage.Client(credentials=credentials)
        logger.info("Initialized Google Cloud Storage client")
    return _storage_client


def get_bucket(bucket_name: Optional[str] = None):
    """Get a GCS bucket by name"""
    bucket_name = bucket_name or os.environ.get("GCS_BUCKET_NAME")
    if not bucket_name:
        raise ValueError("Bucket name not provided and GCS_BUCKET_NAME not set")
    
    client = get_storage_client()
    return client.bucket(bucket_name)


def upload_file(
    local_path: str,
    destination_blob_name: str,
    bucket_name: Optional[str] = None,
    content_type: Optional[str] = None,
    make_public: bool = False,
    signed_url_hours: int = 24
) -> Dict[str, str]:
    """
    Upload a file to Google Cloud Storage.
    
    Args:
        local_path: Path to local file
        destination_blob_name: Name/path in the bucket
        bucket_name: GCS bucket name (uses GCS_BUCKET_NAME if not provided)
        content_type: MIME type of the file
        make_public: If True, makes the blob publicly accessible
        signed_url_hours: Hours until signed URL expires (default 24)
    
    Returns:
        Dict with 'gs_uri', 'signed_url', and optionally 'public_url'
    """
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    
    if content_type:
        blob.content_type = content_type
    
    blob.upload_from_filename(local_path)
    logger.info(f"Uploaded {local_path} to gs://{bucket.name}/{destination_blob_name}")
    
    result = {
        "gs_uri": f"gs://{bucket.name}/{destination_blob_name}",
        "blob_name": destination_blob_name
    }
    
    if make_public:
        blob.make_public()
        result["public_url"] = blob.public_url
        logger.info(f"Made blob public: {blob.public_url}")
    
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=signed_url_hours),
        method="GET"
    )
    result["signed_url"] = signed_url
    
    return result


def upload_from_string(
    content: str,
    destination_blob_name: str,
    bucket_name: Optional[str] = None,
    content_type: str = "text/plain",
    make_public: bool = False,
    signed_url_hours: int = 24
) -> Dict[str, str]:
    """
    Upload string content to Google Cloud Storage.
    
    Args:
        content: String content to upload
        destination_blob_name: Name/path in the bucket
        bucket_name: GCS bucket name
        content_type: MIME type
        make_public: If True, makes the blob publicly accessible
        signed_url_hours: Hours until signed URL expires
    
    Returns:
        Dict with 'gs_uri', 'signed_url', and optionally 'public_url'
    """
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(content, content_type=content_type)
    
    logger.info(f"Uploaded content to gs://{bucket.name}/{destination_blob_name}")
    
    result = {
        "gs_uri": f"gs://{bucket.name}/{destination_blob_name}",
        "blob_name": destination_blob_name
    }
    
    if make_public:
        blob.make_public()
        result["public_url"] = blob.public_url
    
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=signed_url_hours),
        method="GET"
    )
    result["signed_url"] = signed_url
    
    return result


def download_file(
    source_blob_name: str,
    destination_path: str,
    bucket_name: Optional[str] = None
) -> str:
    """
    Download a file from Google Cloud Storage.
    
    Args:
        source_blob_name: Name/path of the blob in bucket
        destination_path: Local path to save the file
        bucket_name: GCS bucket name
    
    Returns:
        Path to downloaded file
    """
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_path)
    
    logger.info(f"Downloaded gs://{bucket.name}/{source_blob_name} to {destination_path}")
    return destination_path


def download_as_string(
    source_blob_name: str,
    bucket_name: Optional[str] = None
) -> str:
    """Download file content as string"""
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    return blob.download_as_text()


def download_as_bytes(
    source_blob_name: str,
    bucket_name: Optional[str] = None
) -> bytes:
    """Download file content as bytes"""
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    return blob.download_as_bytes()


def list_blobs(
    prefix: Optional[str] = None,
    bucket_name: Optional[str] = None,
    max_results: int = 100
) -> List[Dict[str, Any]]:
    """
    List blobs in a bucket.
    
    Args:
        prefix: Filter blobs by prefix (folder path)
        bucket_name: GCS bucket name
        max_results: Maximum number of results
    
    Returns:
        List of blob info dictionaries
    """
    bucket = get_bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=prefix, max_results=max_results)
    
    result = []
    for blob in blobs:
        result.append({
            "name": blob.name,
            "size": blob.size,
            "content_type": blob.content_type,
            "updated": blob.updated.isoformat() if blob.updated else None,
            "public_url": f"https://storage.googleapis.com/{bucket.name}/{blob.name}"
        })
    
    return result


def delete_blob(
    blob_name: str,
    bucket_name: Optional[str] = None
) -> bool:
    """Delete a blob from the bucket"""
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.delete()
    logger.info(f"Deleted gs://{bucket.name}/{blob_name}")
    return True


def generate_signed_url(
    blob_name: str,
    bucket_name: Optional[str] = None,
    expiration_hours: int = 24,
    method: str = "GET"
) -> str:
    """
    Generate a signed URL for temporary access to a blob.
    
    Args:
        blob_name: Name of the blob
        bucket_name: GCS bucket name
        expiration_hours: Hours until URL expires
        method: HTTP method (GET, PUT, etc.)
    
    Returns:
        Signed URL string
    """
    bucket = get_bucket(bucket_name)
    blob = bucket.blob(blob_name)
    
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expiration_hours),
        method=method
    )
    
    return url


# ============================================================
# GOOGLE CLOUD SQL
# ============================================================

def get_sql_engine():
    """
    Get or create SQLAlchemy engine connected to Cloud SQL.
    Uses the Cloud SQL Python Connector for secure connections.
    """
    global _sql_connector, _sql_engine
    
    if _sql_engine is not None:
        return _sql_engine
    
    credentials = _get_credentials()
    
    from google.cloud.sql.connector import Connector, IPTypes
    import sqlalchemy
    
    instance_connection_name = os.environ.get("CLOUD_SQL_INSTANCE")
    if not instance_connection_name:
        raise ValueError("CLOUD_SQL_INSTANCE not set (format: project:region:instance)")
    
    db_user = os.environ.get("CLOUD_SQL_USER")
    db_pass = os.environ.get("CLOUD_SQL_PASSWORD")
    db_name = os.environ.get("CLOUD_SQL_DATABASE")
    db_type = os.environ.get("CLOUD_SQL_TYPE", "mysql").lower()
    
    if not all([db_user, db_pass, db_name]):
        raise ValueError("CLOUD_SQL_USER, CLOUD_SQL_PASSWORD, and CLOUD_SQL_DATABASE must be set")
    
    # Pass credentials explicitly to work from outside GCP
    _sql_connector = Connector(credentials=credentials)
    
    if db_type == "postgresql":
        driver = "pg8000"
        dialect = "postgresql+pg8000"
    else:
        driver = "pymysql"
        dialect = "mysql+pymysql"
    
    def getconn():
        conn = _sql_connector.connect(
            instance_connection_name,
            driver,
            user=db_user,
            password=db_pass,
            db=db_name,
            ip_type=IPTypes.PUBLIC
        )
        return conn
    
    _sql_engine = sqlalchemy.create_engine(
        f"{dialect}://",
        creator=getconn,
        pool_pre_ping=True,
        pool_recycle=300
    )
    
    logger.info(f"Connected to Cloud SQL: {instance_connection_name} ({db_type})")
    return _sql_engine


def execute_query(query: str, params: Optional[Dict] = None) -> List[Dict]:
    """
    Execute a SELECT query and return results as list of dicts.
    
    Args:
        query: SQL query string
        params: Query parameters
    
    Returns:
        List of result rows as dictionaries
    """
    import sqlalchemy
    
    engine = get_sql_engine()
    with engine.connect() as conn:
        result = conn.execute(sqlalchemy.text(query), params or {})
        columns = result.keys()
        return [dict(zip(columns, row)) for row in result.fetchall()]


def execute_write(query: str, params: Optional[Dict] = None) -> int:
    """
    Execute an INSERT/UPDATE/DELETE query.
    
    Args:
        query: SQL query string
        params: Query parameters
    
    Returns:
        Number of affected rows
    """
    import sqlalchemy
    
    engine = get_sql_engine()
    with engine.connect() as conn:
        result = conn.execute(sqlalchemy.text(query), params or {})
        conn.commit()
        return result.rowcount


def test_sql_connection() -> Dict[str, Any]:
    """Test the Cloud SQL connection"""
    try:
        engine = get_sql_engine()
        with engine.connect() as conn:
            import sqlalchemy
            result = conn.execute(sqlalchemy.text("SELECT 1 as test"))
            row = result.fetchone()
            return {
                "connected": True,
                "result": row[0] if row else None,
                "instance": os.environ.get("CLOUD_SQL_INSTANCE", "unknown")
            }
    except Exception as e:
        logger.error(f"Cloud SQL connection test failed: {e}")
        return {
            "connected": False,
            "error": str(e)
        }


# ============================================================
# CLEANUP
# ============================================================

def cleanup():
    """Clean up connections (call on app shutdown)"""
    global _sql_connector, _sql_engine, _storage_client
    
    if _sql_connector:
        _sql_connector.close()
        _sql_connector = None
    
    if _sql_engine:
        _sql_engine.dispose()
        _sql_engine = None
    
    _storage_client = None
    logger.info("Cleaned up Google Cloud connections")
