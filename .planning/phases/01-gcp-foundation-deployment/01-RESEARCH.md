# Phase 1: GCP Foundation & Deployment - Research

**Researched:** 2026-03-12
**Domain:** Google Cloud Platform infrastructure -- Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud SQL
**Confidence:** HIGH

## Summary

Phase 1 migrates PharmKo from Replit to Google Cloud Run. The existing codebase has a working multi-stage Dockerfile (Node builds React, Python/Flask serves everything), a cloudbuild.yaml pipeline, and backend services (Cloud SQL, auth, caching). However, several things are broken or misconfigured for a fresh GCP deployment:

1. **cloudbuild.yaml uses deprecated gcr.io** -- Container Registry was shut down March 2025. Must migrate to Artifact Registry (us-central1-docker.pkg.dev).
2. **Dockerfile only copies backend/main.py** -- misses `gcloud_services.py` and `auth_service.py`, so Cloud SQL, auth, and caching will fail at runtime.
3. **No --set-secrets in deployment** -- the current cloudbuild.yaml deploys with `--set-env-vars GCP_PROJECT_ID=$PROJECT_ID` only. All 32 secrets need to be injected via Cloud Run's native `--set-secrets` flag.
4. **OAuth redirects hardcoded to Replit domain** -- `backend/main.py` falls back to `REPLIT_DEV_DOMAIN` for Google OAuth redirect URI. Frontend uses `window.location.origin` (correct), but Google/Facebook OAuth console needs the Cloud Run URL registered.
5. **MySQL/PostgreSQL DDL mismatch** -- `gcloud_services.py` caching DDL uses MySQL syntax (`AUTO_INCREMENT`, `ON DUPLICATE KEY UPDATE`) but the decision is to use PostgreSQL.
6. **Service account** -- existing project uses default SA, needs dedicated `pharmko-cloudrun-sa` with least-privilege roles.

**Primary recommendation:** Fix the Dockerfile to copy all backend modules, rewrite cloudbuild.yaml for Artifact Registry + --set-secrets, create dedicated service account, fix the caching DDL for PostgreSQL, update OAuth redirect URIs to the Cloud Run URL, and deploy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Brief maintenance window approach -- take Replit offline, deploy to Cloud Run, verify, switch over
- App is in dev/demo stage, not serving real production users -- reduces cutover risk
- Keep Replit as fallback for a short period after Cloud Run is verified working
- GCP project is partially set up -- some services may need enabling (Cloud SQL, Secret Manager, Artifact Registry, Cloud Build)
- Fresh start on Cloud SQL -- no critical data needs migrating from Replit
- PostgreSQL as the Cloud SQL engine (matches likely Replit setup and best ecosystem fit)
- Minimize cost on instance sizing -- db-f1-micro or db-g1-small appropriate for current traffic level
- Use default Cloud Run URL (*.run.app) for now -- custom domain can be added later
- Public access from the start -- no IAM restriction needed for testing
- Deploy to us-central1 region (lowest cost, broadest service availability)
- Use Cloud Run managed TLS -- automatic HTTPS, no custom certificates needed
- Production only -- no separate staging environment (test locally before deploying)
- Deployments triggered by push to main branch via Cloud Build trigger
- cloudbuild.yaml stored in repo -- version-controlled build configuration
- Auto-rollback to previous revision if new deployment fails health checks

### Claude's Discretion
- Cloud Build step details and optimization
- Dockerfile configuration and build caching
- Service account role selection (within least-privilege constraint)
- Secret Manager naming conventions and organization
- Cloud SQL connection method (Unix socket vs Cloud SQL Auth Proxy)
- Health check configuration and startup probe settings

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Cloud Run deployment uses Artifact Registry (us-central1-docker.pkg.dev) instead of deprecated gcr.io | Artifact Registry setup commands verified; cloudbuild.yaml image ref format documented; gcr.io shutdown confirmed March 2025 |
| INFRA-02 | Cloud Run service uses dedicated pharmko-cloudrun-sa service account with least-privilege IAM roles | Required roles identified (secretmanager.secretAccessor, cloudsql.client, storage.objectAdmin, logging.logWriter); setup commands documented |
| INFRA-03 | All secrets injected via Cloud Run native --set-secrets from existing Secret Manager secrets | Complete env var -> secret mapping documented; --set-secrets syntax verified; Cloud SQL connector uses ADC on Cloud Run (no GOOGLE_APPLICATION_CREDENTIALS needed) |
| INFRA-04 | Dockerfile copies all backend modules (main.py, gcloud_services.py, auth_service.py) so Cloud SQL, auth, and caching work in production | Current Dockerfile bug identified (only copies main.py); fix is adding COPY commands for all 3 modules |
| INFRA-05 | cloudbuild.yaml updated for Artifact Registry image references and --set-secrets deployment | Complete rewrite documented: gcr.io -> pkg.dev format, deploy step with --set-secrets, remove secret-creation build step |
| INFRA-06 | OAuth redirect URIs updated from Replit domain to Cloud Run URL | Frontend uses window.location.origin (auto-correct); backend has REPLIT_DEV_DOMAIN fallback to remove; Google/Facebook OAuth console needs Cloud Run URL registered |
</phase_requirements>

## Standard Stack

### Core (GCP Services)
| Service | Purpose | Why Standard |
|---------|---------|--------------|
| Cloud Run | Container hosting | Already chosen; auto-scaling, managed TLS, pay-per-use |
| Artifact Registry | Docker image storage | Replaces deprecated gcr.io; pkg.dev format required for new projects |
| Cloud Build | CI/CD pipeline | Already configured; triggers on push to main |
| Secret Manager | Secrets storage | 32 secrets already exist; Cloud Run natively injects via --set-secrets |
| Cloud SQL (PostgreSQL) | Relational database | User auth tables + drug query cache; fresh instance per CONTEXT.md |
| Cloud Storage | File uploads | Existing integration in gcloud_services.py |

### Supporting (Already in Backend)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Flask | 3.0.0 | Backend web framework | No change needed |
| gunicorn | 22.0.0 | WSGI production server | Serves on port 8080 for Cloud Run |
| cloud-sql-python-connector | 1.18.0 (update to ^1.20.0) | Secure Cloud SQL connections | Uses ADC on Cloud Run, no explicit credentials needed |
| pg8000 | 1.31.2 | PostgreSQL driver | Used by Cloud SQL connector when CLOUD_SQL_TYPE=postgresql |
| SQLAlchemy | 2.0.25 | Database ORM | Connection pooling with pool_pre_ping and pool_recycle |
| google-cloud-storage | 2.14.0 | GCS client | Keep as-is |

### gcloud CLI Tools
| Tool | Used In | Purpose |
|------|---------|---------|
| `gcloud run deploy` | cloudbuild.yaml | Deploy container with secrets |
| `gcloud artifacts repositories create` | One-time setup | Create Docker repo in Artifact Registry |
| `gcloud iam service-accounts create` | One-time setup | Create dedicated SA |
| `gcloud projects add-iam-policy-binding` | One-time setup | Grant IAM roles to SA |
| `gcloud sql instances create` | One-time setup | Create PostgreSQL instance |

## Architecture Patterns

### Pattern 1: Cloud Run Native Secret Injection
**What:** Use `--set-secrets` flag in `gcloud run deploy` to inject Secret Manager values as environment variables. Secrets are resolved at instance startup before the container runs.
**When:** For all secrets the app reads via `os.environ.get()`.
**Why:** The backend already reads secrets from environment variables. Cloud Run's `--set-secrets` maps Secret Manager secrets to env vars with zero code changes. This eliminates the need for the `GOOGLE_APPLICATION_CREDENTIALS_JSON` pattern currently in `gcloud_services.py`.

**Syntax (verified from official docs):**
```bash
gcloud run deploy pharmko-app \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,FDA_API_KEY=fda-api-key:latest,GOOGLE_OAUTH_CLIENT_ID=google-oauth-client-id:latest,GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-client-secret:latest,FACEBOOK_APP_ID=facebook-app-id:latest,FACEBOOK_APP_SECRET=facebook-app-secret:latest,CLOUD_SQL_PASSWORD=cloud-sql-password:latest"
```

**Critical behavior:** `--set-secrets` REPLACES all existing secret mappings. Use `--update-secrets` to add/modify without removing existing ones. For the initial deploy, `--set-secrets` is correct. For updates, prefer `--update-secrets`.

### Pattern 2: Cloud SQL Python Connector with ADC
**What:** On Cloud Run, the Cloud SQL Python Connector automatically uses the service account's Application Default Credentials (ADC). No explicit `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS_JSON` needed.
**When:** Cloud Run deployment only (local dev still needs explicit credentials).
**Why:** Cloud Run automatically provides ADC via the service account assigned to the service. The connector detects this and authenticates without any credential files.

**Code change in gcloud_services.py:**
```python
def _get_credentials():
    global _credentials
    if _credentials is not None:
        return _credentials

    # On Cloud Run, ADC handles auth automatically via the service account
    # Try explicit credentials first (for local dev), fall back to ADC
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if creds_json:
        from google.oauth2 import service_account
        creds_dict = json.loads(creds_json)
        _credentials = service_account.Credentials.from_service_account_info(creds_dict)
    elif creds_file and os.path.exists(creds_file):
        from google.oauth2 import service_account
        _credentials = service_account.Credentials.from_service_account_file(creds_file)
    else:
        # ADC: works on Cloud Run, App Engine, Cloud Functions
        import google.auth
        _credentials, _ = google.auth.default()

    return _credentials
```

### Pattern 3: Artifact Registry Image References
**What:** Use `us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app` format for all image references.
**When:** In cloudbuild.yaml and any gcloud run deploy commands.

**cloudbuild.yaml format:**
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest'
```

### Pattern 4: Dedicated Service Account with Least Privilege
**What:** Create `pharmko-cloudrun-sa` (as named in requirements: "pharmko-cloudrun-sa") with only the IAM roles the app needs.

**Required roles:**
| Role | Why Needed |
|------|-----------|
| `roles/secretmanager.secretAccessor` | Read secrets injected via --set-secrets |
| `roles/cloudsql.client` | Connect to Cloud SQL via Python Connector |
| `roles/storage.objectAdmin` | Read/write Cloud Storage bucket |
| `roles/logging.logWriter` | Write application logs (good practice to be explicit) |

### Anti-Patterns to Avoid
- **Do NOT use gcr.io image references** -- Container Registry shut down March 18, 2025. Always use `pkg.dev` format.
- **Do NOT store secrets as Cloud Build substitution variables** -- The current cloudbuild.yaml does this for `_GEMINI_API_KEY` and `_FDA_API_KEY`. Substitution variables are logged in build history. Create secrets once via CLI, reference in --set-secrets.
- **Do NOT use the default Compute Engine service account** -- It has `roles/editor` on the entire project.
- **Do NOT bake secrets into the Docker image** -- The Dockerfile correctly avoids this already.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret injection | Custom Secret Manager API calls in app code | Cloud Run `--set-secrets` flag | Zero code changes; secrets available as env vars at startup; retry/error handling managed by Cloud Run |
| Cloud SQL authentication | Explicit credential file management | ADC (Application Default Credentials) on Cloud Run | Service account identity auto-detected; no credential files to manage or leak |
| Container registry | Self-hosted registry or gcr.io workarounds | Artifact Registry (pkg.dev) | Managed, integrated with Cloud Build, supported going forward |
| HTTPS/TLS | Manual certificate management | Cloud Run managed TLS | Automatic HTTPS on *.run.app domains |
| Health checks | Custom monitoring scripts | Cloud Run startup/liveness probes + `/api/health` endpoint | Flask already has the health endpoint; Cloud Run handles probe lifecycle |

## Common Pitfalls

### Pitfall 1: Dockerfile Only Copies main.py
**What goes wrong:** The current Dockerfile line `COPY backend/main.py ./` copies only main.py. But main.py imports from `gcloud_services` and `auth_service`. The container starts but Cloud SQL, auth, and caching all fail with `ImportError`.
**Why it happens:** The original Replit setup likely had all files in the same directory or used a different mechanism.
**How to avoid:** Change the Dockerfile COPY to include all backend modules:
```dockerfile
COPY backend/main.py backend/gcloud_services.py backend/auth_service.py ./
```
**Warning signs:** Container starts but `/api/config` shows `sql_available: false`, `auth.database_ready: false`. Logs show `ImportError: cannot import name 'gcloud_services'`.

### Pitfall 2: MySQL DDL in PostgreSQL Database
**What goes wrong:** `gcloud_services.py` creates the `drug_query_cache` table with MySQL-specific syntax (`INT AUTO_INCREMENT PRIMARY KEY`, `ON DUPLICATE KEY UPDATE`, `ENGINE=InnoDB`). PostgreSQL rejects this.
**Why it happens:** The codebase was developed with MySQL (Cloud SQL default type is mysql). The auth tables use PostgreSQL-compatible `SERIAL`, but the caching tables don't.
**How to avoid:** Rewrite the caching DDL for PostgreSQL:
```sql
-- MySQL (current, broken):
id INT AUTO_INCREMENT PRIMARY KEY

-- PostgreSQL (correct):
id SERIAL PRIMARY KEY

-- MySQL (current, broken):
ON DUPLICATE KEY UPDATE cached_results = :results

-- PostgreSQL (correct):
ON CONFLICT (query_hash) DO UPDATE SET cached_results = :results
```
Also remove `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` (MySQL-only clause).
**Warning signs:** Error on first drug search: `ProgrammingError: syntax error at or near "AUTO_INCREMENT"`.

### Pitfall 3: CLOUD_SQL_TYPE Defaults to MySQL
**What goes wrong:** `gcloud_services.py` line 370: `db_type = os.environ.get("CLOUD_SQL_TYPE", "mysql").lower()`. If `CLOUD_SQL_TYPE` is not set, it defaults to MySQL and uses pymysql driver, which can't connect to a PostgreSQL instance.
**Why it happens:** Default was set when MySQL was the assumed database.
**How to avoid:** Set `CLOUD_SQL_TYPE=postgresql` as an environment variable in the Cloud Run deployment (via `--set-env-vars` since it's not a secret).
**Warning signs:** Connection error: `pymysql.err.OperationalError: Can't connect to MySQL server`.

### Pitfall 4: REPLIT_DEV_DOMAIN Fallback in OAuth
**What goes wrong:** `backend/main.py` line 271 falls back to `REPLIT_DEV_DOMAIN` for the Google OAuth redirect URI. On Cloud Run, this env var won't exist, causing the redirect_uri to be None.
**Why it happens:** Replit-era code.
**How to avoid:** Remove the REPLIT_DEV_DOMAIN fallback. The frontend already sends `redirect_uri` based on `window.location.origin`, which will be the correct Cloud Run URL. The backend should use the redirect_uri from the request, not construct one from environment.
**Warning signs:** Google OAuth returns `redirect_uri_mismatch` error.

### Pitfall 5: --set-secrets Replaces All Secrets
**What goes wrong:** Using `--set-secrets` on an update replaces ALL secret mappings. If you deploy with `--set-secrets=A=a:latest` and then later deploy with `--set-secrets=B=b:latest`, secret A is removed.
**Why it happens:** `--set-secrets` is a "replace all" operation.
**How to avoid:** For the initial deploy, use `--set-secrets` with ALL secrets in a single comma-separated list. For subsequent updates, use `--update-secrets` to add/modify without removing existing ones.
**Warning signs:** Secrets that worked before suddenly return `None` after a redeployment.

### Pitfall 6: Google/Facebook OAuth Console Not Updated
**What goes wrong:** OAuth works locally but fails on Cloud Run. Google returns `redirect_uri_mismatch`, Facebook returns "URL is not allowed by the Application configuration".
**Why it happens:** The OAuth provider console still has Replit URLs as authorized redirect URIs.
**How to avoid:** After getting the Cloud Run URL (`pharmko-app-XXXXXXXX-uc.a.run.app`), add these to:
- **Google Cloud Console** (APIs & Services > Credentials > OAuth 2.0 Client): Add `https://pharmko-app-XXXXXXXX-uc.a.run.app/auth/google/callback` as authorized redirect URI
- **Facebook Developer Console** (App Settings > Facebook Login): Add `https://pharmko-app-XXXXXXXX-uc.a.run.app/auth/facebook/callback` as valid OAuth redirect URI
**Warning signs:** OAuth redirects fail with provider-specific "URI mismatch" errors.

### Pitfall 7: Cloud Build Service Account Permissions
**What goes wrong:** Cloud Build fails at the `gcloud run deploy` step with permission denied.
**Why it happens:** Cloud Build's default service account may not have permission to deploy to Cloud Run or access Artifact Registry.
**How to avoid:** Grant the Cloud Build service account the `roles/run.admin` and `roles/iam.serviceAccountUser` roles:
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```
**Warning signs:** Cloud Build log shows `PERMISSION_DENIED: Permission 'run.services.update' denied`.

## Code Examples

### Complete Dockerfile Fix (INFRA-04)
```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Python backend with Flask
FROM python:3.11-slim
WORKDIR /app

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built React app from build stage
COPY --from=build /app/dist /app/dist

# Copy ALL backend Python modules (not just main.py)
COPY backend/main.py backend/gcloud_services.py backend/auth_service.py ./

EXPOSE 8080
ENV FLASK_APP=main.py
ENV PORT=8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "300", "main:app"]
```

Key changes from current Dockerfile:
- `npm ci` instead of `npm install` (deterministic builds from lockfile)
- Copy `package-lock.json` for npm ci
- Copy `gcloud_services.py` and `auth_service.py` (fixes INFRA-04)
- 2 gunicorn workers (appropriate for 512Mi memory)
- Explicit `--timeout 300` on gunicorn (matches Cloud Run timeout)

### Complete cloudbuild.yaml Rewrite (INFRA-01, INFRA-05)
```yaml
steps:
  # Step 1: Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest'
      - '.'

  # Step 2: Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'

  # Step 3: Push latest tag
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest'

  # Step 4: Deploy to Cloud Run with secrets and env vars
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'pharmko-app'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--service-account'
      - 'pharmko-cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-secrets'
      - 'GEMINI_API_KEY=gemini-api-key:latest,FDA_API_KEY=fda-api-key:latest,GOOGLE_OAUTH_CLIENT_ID=google-oauth-client-id:latest,GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-client-secret:latest,FACEBOOK_APP_ID=facebook-app-id:latest,FACEBOOK_APP_SECRET=facebook-app-secret:latest,CLOUD_SQL_PASSWORD=cloud-sql-password:latest,GCS_BUCKET_NAME=gcs-bucket-name:latest'
      - '--set-env-vars'
      - 'CLOUD_SQL_INSTANCE=$PROJECT_ID:us-central1:pharmko-db,CLOUD_SQL_USER=pharmko,CLOUD_SQL_DATABASE=pharmko,CLOUD_SQL_TYPE=postgresql,AUTH_ENABLED=true'
      - '--memory'
      - '512Mi'
      - '--timeout'
      - '300'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '10'

options:
  logging: CLOUD_LOGGING_ONLY

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest'
```

### Environment Variable to Secret Mapping (INFRA-03)

The backend reads these env vars. Here is the complete mapping:

**Secrets (inject via --set-secrets):**
| Env Var Name | Secret Manager Name | Used By | Required? |
|-------------|--------------------|---------|---------  |
| `GEMINI_API_KEY` | `gemini-api-key` | main.py get_secret() | Yes |
| `FDA_API_KEY` | `fda-api-key` | main.py get_secret() | Yes |
| `GOOGLE_OAUTH_CLIENT_ID` | `google-oauth-client-id` | auth_service.py login_google() | Yes (for OAuth) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `google-oauth-client-secret` | auth_service.py login_google() | Yes (for OAuth) |
| `FACEBOOK_APP_ID` | `facebook-app-id` | main.py facebook_callback() | Yes (for OAuth) |
| `FACEBOOK_APP_SECRET` | `facebook-app-secret` | main.py facebook_callback() | Yes (for OAuth) |
| `CLOUD_SQL_PASSWORD` | `cloud-sql-password` | gcloud_services.py get_sql_engine() | Yes |
| `GCS_BUCKET_NAME` | `gcs-bucket-name` | gcloud_services.py is_storage_configured() | If using GCS |

**Environment variables (inject via --set-env-vars, not secrets):**
| Env Var Name | Value | Used By | Why Not Secret? |
|-------------|-------|---------|----------------|
| `CLOUD_SQL_INSTANCE` | `$PROJECT_ID:us-central1:pharmko-db` | gcloud_services.py get_sql_engine() | Not sensitive; contains project/region/instance name |
| `CLOUD_SQL_USER` | `pharmko` | gcloud_services.py get_sql_engine() | Not sensitive (username, not password) |
| `CLOUD_SQL_DATABASE` | `pharmko` | gcloud_services.py get_sql_engine() | Not sensitive |
| `CLOUD_SQL_TYPE` | `postgresql` | gcloud_services.py get_sql_engine() | Not sensitive; MUST be set (default is mysql) |
| `AUTH_ENABLED` | `true` | main.py | Not sensitive |
| `PORT` | `8080` | main.py, gunicorn | Set by Cloud Run automatically |

**Not needed on Cloud Run (remove/ignore):**
| Env Var Name | Why Not Needed |
|-------------|----------------|
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | ADC replaces this on Cloud Run |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC replaces this on Cloud Run |
| `REPLIT_DEV_DOMAIN` | Replit-specific; remove fallback from code |
| `GCP_PROJECT_ID` | Not used by the app (was in old cloudbuild.yaml --set-env-vars) |

**Note on "32 secrets":** The STATE.md mentions 32 secrets already in Secret Manager. The app code references ~8 distinct secrets (listed above). The remaining secrets in Secret Manager may be duplicates, test values, or from a previous setup. Only the 8 secrets the code actually reads need to be mapped via --set-secrets. The planner should verify which of the 32 existing secrets match the names above, or create new ones with the correct names.

### PostgreSQL DDL Fix for Caching Table
```python
# gcloud_services.py - initialize_cache_table()
create_table_query = """
CREATE TABLE IF NOT EXISTS drug_query_cache (
    id SERIAL PRIMARY KEY,
    drug_name VARCHAR(255) NOT NULL,
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    cached_results JSONB NOT NULL,
    adverse_events_count INT DEFAULT 0,
    journal_articles_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

# gcloud_services.py - save_query_cache()
upsert_query = """
INSERT INTO drug_query_cache (drug_name, query_hash, cached_results, adverse_events_count, journal_articles_count)
VALUES (:drug_name, :hash, :results, :adverse_count, :articles_count)
ON CONFLICT (query_hash) DO UPDATE SET
    cached_results = EXCLUDED.cached_results,
    adverse_events_count = EXCLUDED.adverse_events_count,
    journal_articles_count = EXCLUDED.journal_articles_count,
    updated_at = CURRENT_TIMESTAMP
"""

# gcloud_services.py - get_cached_query() - use AGE() instead of DATEDIFF()
query = """
SELECT id, cached_results, adverse_events_count, journal_articles_count,
       EXTRACT(DAY FROM AGE(NOW(), created_at)) as days_old
FROM drug_query_cache
WHERE query_hash = :hash
ORDER BY created_at DESC LIMIT 1
"""
```

Key PostgreSQL changes:
- `SERIAL` instead of `AUTO_INCREMENT`
- `JSONB` instead of `JSON` (better indexing/querying in PostgreSQL)
- `ON CONFLICT ... DO UPDATE` instead of `ON DUPLICATE KEY UPDATE`
- `EXCLUDED.column_name` instead of `:param` in UPDATE clause
- `EXTRACT(DAY FROM AGE(...))` instead of `DATEDIFF(NOW(), created_at)`
- Remove `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

### OAuth Redirect URI Fix (INFRA-06)
```python
# backend/main.py - google_auth() endpoint
# BEFORE (broken on Cloud Run):
redirect_uri = request.args.get("redirect_uri")
if not redirect_uri:
    dev_domain = os.environ.get("REPLIT_DEV_DOMAIN", "")
    redirect_uri = f"https://{dev_domain}/auth/google/callback" if dev_domain else None

# AFTER (works everywhere):
redirect_uri = request.args.get("redirect_uri")
if not redirect_uri:
    # Use the request's host header (works on Cloud Run, local dev, any domain)
    redirect_uri = f"{request.scheme}://{request.host}/auth/google/callback"
```

Frontend is already correct -- `App.tsx` line 103 uses `window.location.origin` which auto-adapts to the Cloud Run URL.

### ADC Fallback for gcloud_services.py (INFRA-03)
```python
# Add google-auth to requirements.txt:
# google-auth==2.28.0

# Update _get_credentials() in gcloud_services.py:
def _get_credentials():
    global _credentials
    if _credentials is not None:
        return _credentials

    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if creds_json:
        from google.oauth2 import service_account
        creds_dict = json.loads(creds_json)
        _credentials = service_account.Credentials.from_service_account_info(creds_dict)
        logger.info("Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON")
    elif creds_file and os.path.exists(creds_file):
        from google.oauth2 import service_account
        _credentials = service_account.Credentials.from_service_account_file(creds_file)
        logger.info(f"Loaded credentials from file: {creds_file}")
    else:
        # Application Default Credentials (works on Cloud Run via service account)
        import google.auth
        _credentials, _ = google.auth.default()
        logger.info("Loaded credentials via Application Default Credentials (ADC)")

    return _credentials
```

Note: `google-auth` is already a transitive dependency of `google-cloud-storage` and `cloud-sql-python-connector`, so no new install is needed. But adding it explicitly to requirements.txt is good practice.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gcr.io (Container Registry) | Artifact Registry (pkg.dev) | March 2025 (shutdown) | **Must** migrate; gcr.io no longer accepts new writes |
| Cloud Build substitution vars for secrets | Secret Manager + Cloud Run --set-secrets | 2023+ (best practice since Cloud Run GA) | Substitution vars are logged; --set-secrets is encrypted |
| Default Compute Engine SA | Dedicated service account | Always recommended, now enforced in best practices | Default SA has Editor role; dedicated SA limits blast radius |
| Explicit GOOGLE_APPLICATION_CREDENTIALS | ADC on Cloud Run | Since Cloud Run GA | No credential files needed; service account identity is automatic |

## GCP Setup Commands (One-Time)

These commands need to be run once before the first Cloud Build deployment:

```bash
# Set project
export PROJECT_ID="pharmawatch-project1"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iam.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create pharmko-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="PharmKo container images"

# Create dedicated service account
gcloud iam service-accounts create pharmko-cloudrun-sa \
  --display-name="PharmKo Cloud Run SA"

# Grant IAM roles to service account
for ROLE in \
  roles/secretmanager.secretAccessor \
  roles/cloudsql.client \
  roles/storage.objectAdmin \
  roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:pharmko-cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# Grant Cloud Build permissions to deploy to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create Cloud SQL PostgreSQL instance (db-f1-micro for cost)
gcloud sql instances create pharmko-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=CHANGE_THIS_PASSWORD \
  --storage-size=10GB \
  --storage-type=HDD

# Create database and user
gcloud sql databases create pharmko --instance=pharmko-db
gcloud sql users create pharmko \
  --instance=pharmko-db \
  --password=CHANGE_THIS_PASSWORD

# Create/verify secrets in Secret Manager
# (32 secrets may already exist; verify naming matches code expectations)
gcloud secrets list --filter="name:projects/$PROJECT_ID"
```

## Open Questions

1. **Existing 32 secrets naming convention**
   - What we know: STATE.md says 32 secrets exist in Secret Manager in project pharmawatch-project1
   - What's unclear: Whether secret names match what the code expects (e.g., does `gemini-api-key` exist or is it named `GEMINI_API_KEY`?)
   - Recommendation: During plan execution, list existing secrets with `gcloud secrets list` and verify naming. Cloud Run --set-secrets format is `ENV_VAR_NAME=secret-name:version` so naming is flexible (env var name can differ from secret name).

2. **Cloud SQL instance existence**
   - What we know: GCP project is "partially set up" per CONTEXT.md. CONTEXT.md says "fresh start on Cloud SQL."
   - What's unclear: Whether a Cloud SQL instance already exists that should be reused or whether a new one must be created.
   - Recommendation: Check with `gcloud sql instances list`. If an instance exists, create a new database on it. If not, create instance per the setup commands above.

3. **GCS bucket usage**
   - What we know: Code has Cloud Storage integration, but it's optional (gcloud_services.py checks `is_storage_configured()`).
   - What's unclear: Whether GCS is actively used in the current app or just scaffolded.
   - Recommendation: If no GCS bucket is needed for Phase 1 functionality, skip the `GCS_BUCKET_NAME` secret and `roles/storage.objectAdmin` role. Can be added later.

## Sources

### Primary (HIGH confidence)
- [Cloud Run Secret Configuration (official docs)](https://docs.google.com/run/docs/configuring/services/secrets) -- --set-secrets syntax, behavior, and env var injection
- [Deploying to Cloud Run using Cloud Build (official docs)](https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run) -- cloudbuild.yaml deploy step format
- [Artifact Registry: Create Repositories (official docs)](https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos) -- repository creation commands
- [Artifact Registry: Store Docker Images (official docs)](https://docs.cloud.google.com/artifact-registry/docs/docker/store-docker-container-images) -- image push/pull format
- [Cloud SQL Python Connector (GitHub)](https://github.com/GoogleCloudPlatform/cloud-sql-python-connector) -- ADC support, version info
- [Connect from Cloud Run to Cloud SQL (official docs)](https://docs.cloud.google.com/sql/docs/mysql/connect-run) -- service account auth via ADC
- [Container Registry Shutdown (official docs)](https://docs.cloud.google.com/artifact-registry/docs/transition/changes-docker) -- gcr.io deprecation timeline

### Secondary (MEDIUM confidence)
- [Cloud Build with Artifact Registry (oneuptime blog, Feb 2026)](https://oneuptime.com/blog/post/2026-02-17-how-to-build-and-push-docker-images-to-artifact-registry-using-cloud-build/view) -- verified cloudbuild.yaml patterns
- [Migrating to Cloud Run's Secret Manager Integration (DEV Community)](https://dev.to/googlecloud/migrating-to-cloud-run-s-secret-manager-integration-from-libraries-34o) -- migration approach from API calls to --set-secrets

### Codebase (HIGH confidence - direct inspection)
- `Dockerfile` -- current multi-stage build, identified missing COPY for gcloud_services.py and auth_service.py
- `cloudbuild.yaml` -- current gcr.io references and substitution variable anti-pattern identified
- `backend/main.py` -- REPLIT_DEV_DOMAIN fallback and all env var usage mapped
- `backend/gcloud_services.py` -- Cloud SQL connector setup, MySQL DDL identified, CLOUD_SQL_TYPE default identified
- `backend/auth_service.py` -- PostgreSQL-compatible DDL confirmed, OAuth env var usage mapped
- `backend/requirements.txt` -- current dependency versions verified
- `App.tsx` -- OAuth callback flow uses window.location.origin (correct for Cloud Run)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all GCP services are official, well-documented, and verified via official docs
- Architecture: HIGH -- patterns directly match official Cloud Run deployment guides; code changes verified against codebase
- Pitfalls: HIGH -- all pitfalls identified from direct codebase inspection (Dockerfile bug, MySQL DDL, CLOUD_SQL_TYPE default, REPLIT_DEV_DOMAIN fallback)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (GCP services are stable; 30-day window is appropriate)
