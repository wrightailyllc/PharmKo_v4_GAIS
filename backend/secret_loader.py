import os
from functools import lru_cache

def _on_cloud_run() -> bool:
    # Cloud Run sets these
    return bool(os.getenv("K_SERVICE") or os.getenv("PORT"))

@lru_cache(maxsize=None)
def _sm_client():
    # Lazy import only when needed (local dev might not have creds)
    from google.cloud import secretmanager
    return secretmanager.SecretManagerServiceClient()

def _project_number() -> str:
    # Prefer explicit, otherwise derive from metadata in Cloud Run
    pn = os.getenv("GCP_PROJECT_NUMBER")
    if pn:
        return pn
    # Fallback: try PROJECT_ID and fetch number via metadata (optional, skip for brevity)
    # Better: set GCP_PROJECT_NUMBER as an env var at deploy.
    raise RuntimeError("Set GCP_PROJECT_NUMBER as an env var for Secret Manager paths.")

def _secret_path(name: str, version: str = "latest") -> str:
    # projects/<NUMBER>/secrets/<NAME>/versions/<VERSION>
    return f"projects/{_project_number()}/secrets/{name}/versions/{version}"

def get_secret(name: str, default: str | None = None) -> str:
    """
    Read from env first (easy overrides), then Secret Manager in Cloud Run.
    """
    val = os.getenv(name)
    if val:
        return val
    if _on_cloud_run():
        resp = _sm_client().access_secret_version(request={"name": _secret_path(name)})
        return resp.payload.data.decode("utf-8")
    if default is not None:
        return default
    raise KeyError(f"Secret {name} not found in env and Secret Manager not available.")

def need(*names: str) -> dict:
    """Convenience: fetch several secrets at once."""
    return {n: get_secret(n) for n in names}
