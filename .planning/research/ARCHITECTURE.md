# Architecture Patterns

**Domain:** Consumer-facing pharmaceutical drug safety analysis (React + Flask on Cloud Run)
**Researched:** 2026-03-12

## Recommended Architecture

### Single-Container Monolith on Cloud Run

PharmKo should deploy as a **single Cloud Run service** running one container that bundles the Flask backend with the pre-built React static assets. This is the correct architecture for this project because:

1. **Team size:** Single developer. Microservices add coordination, debugging, and deployment overhead that costs 2-4x more operational burden with zero benefit at this scale. (MEDIUM confidence -- [supported by 2025-2026 industry analysis](https://www.javacodegeeks.com/2025/12/microservices-vs-monoliths-in-2026-when-each-architecture-wins.html) and [CNCF survey data](https://medium.com/@pawel.piwosz/monolith-vs-microservices-2025-real-cloud-migration-costs-and-hidden-challenges-8b453a3c71ec))
2. **Traffic profile:** Low-to-moderate, consumer lookup tool -- not a high-throughput streaming service.
3. **Existing pattern:** The current Dockerfile already does this (multi-stage: Node builds React, Python serves both). This is validated and working.
4. **Latency:** Single container means zero inter-service network overhead. A microservices split would add 10-50ms per service hop.

```
[Cloud Run Service: pharmko-app]
  |
  +-- Container (Python 3.11-slim + Gunicorn)
  |     |
  |     +-- Flask App (port 8080)
  |     |     +-- /api/* routes --> Flask handlers
  |     |     +-- /drug/* routes --> Flask injects OG meta tags, serves index.html
  |     |     +-- /* routes --> serve React dist/index.html (SPA catch-all)
  |     |     +-- /static files --> serve from dist/ directory
  |     |
  |     +-- React Build Artifacts (copied from Node build stage)
  |           +-- dist/index.html
  |           +-- dist/assets/*.js, *.css
  |
  +-- Cloud Run Managed Infrastructure
        +-- HTTPS termination
        +-- Auto-scaling (0 to N instances)
        +-- Request routing
        +-- Secret Manager env var injection
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Flask API** (`backend/main.py`) | Secret retrieval, auth endpoints, caching endpoints, Cloud SQL/Storage access, static file serving, OG meta tag injection for drug pages | Cloud Secret Manager (via env vars), Cloud SQL, Cloud Storage, openFDA API (via frontend proxy) |
| **React SPA** (`dist/`) | Drug search UI, safety score visualization, report rendering, PDF export, client-side routing, motion animations | Flask API (same origin `/api/*`), Gemini API (direct from client via fetched key), openFDA API (direct from client via fetched key) |
| **Cloud SQL** | Query cache (30-day drug results), user authentication data | Flask API only |
| **Cloud Storage** | File uploads, signed URL generation | Flask API only |
| **Secret Manager** | Stores GEMINI_API_KEY, FDA_API_KEY, OAuth secrets, DB credentials | Cloud Run (injected at startup as env vars via --set-secrets) |
| **Artifact Registry** | Docker image storage (replaces deprecated gcr.io) | Cloud Build pushes images, Cloud Run pulls images |
| **Cloud Build** | CI/CD pipeline, Docker image builds, deployment triggers | Artifact Registry, Cloud Run |

### Data Flow

#### Drug Analysis Request Flow

```
1. User types drug name in React UI
   |
2. React calls Flask: POST /api/analysis/cached {drug_name}
   |
3. Flask checks Cloud SQL cache (< 30 days old?)
   |
   +-- Cache HIT --> Return cached results to React
   |
   +-- Cache MISS:
       |
4.     React calls Flask: GET /api/secrets/gemini-key
       React calls Flask: GET /api/secrets/fda-key
       |
5.     React calls openFDA API directly (FAERS adverse events)
       React calls Gemini API directly (AI analysis)
       React calls ClinicalTrials.gov, EuropePMC (supplementary data)
       |
6.     React receives all results, composites into AnalysisResult
       |
7.     React calls Flask: POST /api/analysis/save-cache {drug_name, results}
       |
8.     Flask saves to Cloud SQL for future cache hits
       |
9.     React renders KPI dashboard + AI report + source data viewer
       (motion animations stagger score cards in, scroll reveals report sections)
```

**Important architectural note:** The current design has the frontend making direct API calls to openFDA and Gemini after fetching keys from the backend. This is a Replit-era pattern that should eventually be refactored to proxy all external API calls through Flask (see Anti-Patterns below), but is acceptable for the Cloud Run migration phase.

#### Shareable Drug Page Flow (with OG Meta Tags)

```
1. User visits /drug/metformin (direct URL or shared link)
   |
2. Cloud Run receives request --> Flask catch-all route
   |
3. Flask detects /drug/* path:
   |
   +-- Reads dist/index.html
   +-- Injects drug-specific OG meta tags into <head>:
   |     og:title = "Metformin Safety Report - PharmKo"
   |     og:description = "AI-powered safety analysis..."
   |     og:url = "https://pharmko.app/drug/metformin"
   +-- Returns modified HTML
   |
4. Browser loads React, React Router matches /drug/:drugSlug
   |
5. DashboardPage reads drugSlug via useParams()
   |
6. Auto-triggers analysis for "metformin"
   |
7. (Follows Drug Analysis Request Flow above)
```

**Why Flask-side injection:** Social media crawlers (Facebook, Twitter/X, iMessage, WhatsApp, LinkedIn) do NOT execute JavaScript. They read only the initial HTML response. react-helmet-async updates meta tags in the browser DOM, which is invisible to these crawlers. Flask must inject the tags server-side.

#### Authentication Flow

```
1. User clicks Login
   |
2. React shows AuthModal (email/password or OAuth)
   |
   +-- Email/Password:
   |     React --> POST /api/auth/login --> Flask validates --> Cloud SQL
   |
   +-- Google OAuth:
   |     React --> GET /api/auth/google --> Flask returns auth_url
   |     Browser redirects to Google --> callback to /auth/google/callback
   |     React --> POST /api/auth/google/callback {code} --> Flask exchanges token
   |
   +-- Facebook OAuth:
         Similar flow via /api/auth/facebook/*
   |
3. Flask returns session_token + user profile
   |
4. React stores in localStorage, includes in Authorization header
```

## Patterns to Follow

### Pattern 1: Cloud Run Native Secret Injection

**What:** Use Cloud Run's built-in `--set-secrets` flag to inject Secret Manager values as environment variables at container startup, instead of manually calling the Secret Manager API from application code.
**When:** For all secrets (API keys, DB credentials, OAuth secrets).
**Why:** Eliminates the need for `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable pattern currently used in `gcloud_services.py`. Secrets are injected before the container starts, verified by Cloud Run, and the service account just needs `roles/secretmanager.secretAccessor`. The existing `get_secret()` function in `backend/main.py` already reads from `os.environ.get()`, so this is a zero-code-change migration.
**Confidence:** HIGH -- [verified in Cloud Run official docs](https://docs.cloud.google.com/run/docs/configuring/services/secrets)

**Deployment command:**
```bash
gcloud run deploy pharmko-app \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account pharmko-run-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,FDA_API_KEY=fda-api-key:latest" \
  --set-secrets="CLOUD_SQL_PASSWORD=cloud-sql-password:latest" \
  --set-secrets="GOOGLE_OAUTH_CLIENT_ID=google-oauth-client-id:latest" \
  --set-secrets="GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-client-secret:latest" \
  --set-secrets="FACEBOOK_APP_ID=facebook-app-id:latest,FACEBOOK_APP_SECRET=facebook-app-secret:latest" \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,CLOUD_SQL_INSTANCE=$PROJECT_ID:us-central1:pharmko-db,CLOUD_SQL_USER=pharmko,CLOUD_SQL_DATABASE=pharmko,CLOUD_SQL_TYPE=mysql" \
  --memory 512Mi \
  --timeout 300
```

### Pattern 2: Dedicated Service Account with Least Privilege

**What:** Create a dedicated service account `pharmko-run-sa` with only the IAM roles the app actually needs, instead of using the default Compute Engine service account.
**When:** Always, for any Cloud Run deployment.
**Why:** The default service account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) has overly broad `roles/editor` permissions. A dedicated SA limits blast radius.
**Confidence:** HIGH -- [verified in Cloud Run identity docs](https://docs.cloud.google.com/run/docs/configuring/services/service-identity) and [IAM best practices](https://docs.cloud.google.com/iam/docs/best-practices-service-accounts)

**Required roles for pharmko-run-sa:**
```
roles/secretmanager.secretAccessor   # Read secrets from Secret Manager
roles/cloudsql.client                # Connect to Cloud SQL via connector
roles/storage.objectAdmin            # Read/write Cloud Storage bucket
roles/logging.logWriter              # Write logs (auto-granted but explicit is better)
```

**Setup commands:**
```bash
# Create service account
gcloud iam service-accounts create pharmko-run-sa \
  --display-name="PharmKo Cloud Run SA"

# Grant roles
for ROLE in roles/secretmanager.secretAccessor roles/cloudsql.client roles/storage.objectAdmin roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:pharmko-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$ROLE"
done
```

### Pattern 3: Artifact Registry for Container Images

**What:** Use Artifact Registry (`pkg.dev` format) instead of Container Registry (`gcr.io`) for storing Docker images.
**When:** Immediately -- required for the new GCP project.
**Why:** Container Registry was shut down March 18, 2025. The existing `cloudbuild.yaml` uses `gcr.io/$PROJECT_ID/pharmko-app` which will not work for new projects. Artifact Registry is the replacement.
**Confidence:** HIGH -- [verified in official migration docs](https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr)

**Updated cloudbuild.yaml image references:**
```yaml
# OLD (broken)
- 'gcr.io/$PROJECT_ID/pharmko-app:$COMMIT_SHA'

# NEW
- 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
```

### Pattern 4: Flask SPA Catch-All with OG Meta Injection

**What:** Flask serves the React SPA by first checking if a requested path maps to a real static file in `dist/`, then for `/drug/*` paths injects Open Graph meta tags, and falls back to `index.html` for all other non-API routes.
**When:** Phase 2-3, after core deployment works.
**Confidence:** HIGH -- the SPA catch-all pattern already exists in `backend/main.py`; meta injection is a standard pattern per [multiple Flask + React SPA guides](https://jeremylixandre.com/single-page-app-prerendering-with-flask/).

**Implementation approach:**
```python
import re

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    dist_path = Path("/app/dist").resolve()

    # Skip API routes
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404

    # Try to serve static files first
    if path:
        file_path = dist_path / path
        try:
            if file_path.resolve().is_relative_to(dist_path) and file_path.is_file():
                return send_file(str(file_path))
        except (ValueError, Exception):
            pass

    # Read index.html
    index_file = dist_path / "index.html"
    if not index_file.exists():
        return jsonify({"error": "Application not found"}), 404

    html_content = index_file.read_text()

    # Inject OG meta tags for drug pages
    if path.startswith("drug/"):
        drug_slug = path.replace("drug/", "")
        drug_name = drug_slug.replace("-", " ").title()
        og_tags = f'''
        <meta property="og:title" content="{drug_name} Safety Report - PharmKo" />
        <meta property="og:description" content="AI-powered safety analysis for {drug_name}. See adverse events, clinical data, and safety scores backed by FDA data." />
        <meta property="og:url" content="https://pharmko.app/drug/{drug_slug}" />
        <meta property="og:type" content="article" />
        <meta name="description" content="{drug_name} drug safety analysis - powered by FDA adverse event data and AI." />
        <title>{drug_name} Safety Report - PharmKo</title>
        '''
        html_content = html_content.replace('</head>', f'{og_tags}</head>')

    return html_content, 200, {'Content-Type': 'text/html'}
```

### Pattern 5: Motion + Tailwind Separation of Concerns

**What:** Use Tailwind CSS for all styling (colors, spacing, typography, responsive). Use Motion for all animation (entrance, exit, hover, scroll, layout). Never mix them.
**When:** All frontend animation work.
**Why:** Tailwind's `transition-*` classes conflict with Motion's animation system. Applying both causes stuttery, unpredictable behavior. The official Motion docs explicitly warn about this.
**Confidence:** HIGH -- [verified in Motion + Tailwind docs](https://motion.dev/docs/react-tailwind)

**Correct pattern:**
```tsx
import { motion } from "motion/react";

// Score card with entrance animation
<motion.div
  className="rounded-lg border p-4 border-green-500/50 bg-green-900/20"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: index * 0.1 }}
>
  <span className="text-3xl font-bold text-green-400">{score}</span>
</motion.div>

// Report section with scroll-triggered reveal
<motion.section
  className="mt-8 p-6 bg-gray-800 rounded-lg"
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.5 }}
>
  {/* Report content */}
</motion.section>
```

**Anti-pattern (WRONG):**
```tsx
// DO NOT combine Tailwind transitions with Motion
<motion.div
  className="transition-all duration-300 ease-in-out"  // CONFLICT!
  animate={{ opacity: 1, scale: 1 }}
/>
```

### Pattern 6: Two-Tier Caching for FDA Data

**What:** Layer an in-process memory cache on top of the existing Cloud SQL cache to avoid database round-trips for hot drug queries.
**When:** After Cloud Run deployment is stable and serving real traffic.
**Why:** openFDA rate limits (240 req/min, 120K/day with key) mean repeated queries for the same drug should never hit the FDA API. The existing Cloud SQL 30-day cache is good. Adding a Python `cachetools.TTLCache` for frequently-queried drugs eliminates the Cloud SQL round-trip too.
**Confidence:** MEDIUM -- openFDA rate limits are [verified from official docs](https://open.fda.gov/apis/authentication/), the caching strategy is a standard pattern.

```
Request for "metformin"
  |
  +-- L1: In-process TTLCache (5-minute TTL, per Cloud Run instance)
  |     HIT? --> Return immediately (< 1ms)
  |
  +-- L2: Cloud SQL cache (30-day TTL, shared across instances)
  |     HIT? --> Return, populate L1
  |
  +-- L3: openFDA API + Gemini API (live fetch)
        --> Return, populate L2 and L1
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Splitting Into Separate Frontend and Backend Cloud Run Services

**What:** Deploying the React frontend as a separate Cloud Run service (e.g., behind nginx) and the Flask API as another.
**Why bad:** Adds CORS complexity, doubles Cloud Run costs, requires inter-service authentication or public API endpoints, doubles deployment pipeline complexity, and introduces network latency between services. The existing docker-compose.yml and separate Dockerfiles (backend.Dockerfile, frontend.Dockerfile) are development artifacts from Replit, not a production architecture recommendation.
**Instead:** Single container with Flask serving both the API and the built React static files. This is already the pattern in the main `Dockerfile`.

### Anti-Pattern 2: Exposing API Keys to Frontend via /api/secrets/* Endpoints

**What:** The current pattern where React fetches Gemini and FDA API keys from Flask, then calls external APIs directly from the browser.
**Why bad:** API keys are visible in browser DevTools network tab. Any user can extract and abuse them. Rate limit attribution is per-key, so abuse exhausts the quota for all users.
**Instead (eventual):** Move all external API calls to Flask backend. Frontend sends `POST /api/analyze {drug_name}`, Flask calls Gemini and FDA, returns results. This is a Phase 2+ refactor, not a migration blocker.
**Confidence:** HIGH -- this is a well-known security pattern.

### Anti-Pattern 3: Using Default Compute Engine Service Account

**What:** Deploying Cloud Run with the default service account.
**Why bad:** The default SA has `roles/editor` which grants write access to almost every GCP resource. If the container is compromised, the attacker has broad project access.
**Instead:** Create `pharmko-run-sa` with only the 4 roles listed in Pattern 2.

### Anti-Pattern 4: Storing Secrets as Cloud Build Substitution Variables

**What:** The current `cloudbuild.yaml` passes `_GEMINI_API_KEY` and `_FDA_API_KEY` as substitution variables and creates secrets during the build step.
**Why bad:** Substitution variables are logged in Cloud Build history. They are not encrypted at rest in the trigger configuration. This mixes deployment concerns (creating secrets) with build concerns (building images).
**Instead:** Create secrets once via CLI or Terraform. Reference them in Cloud Run `--set-secrets` at deploy time. The build step should only build the image and push it.

### Anti-Pattern 5: Using gcr.io for New Projects

**What:** Continuing to use `gcr.io/$PROJECT_ID/` image references in `cloudbuild.yaml`.
**Why bad:** Container Registry was shut down March 18, 2025. While gcr.io URLs may work via Artifact Registry redirect on existing projects, new projects should use `pkg.dev` format directly.
**Instead:** Create an Artifact Registry repository and use `us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app` format.

### Anti-Pattern 6: Mixing Tailwind Transitions with Motion Animations

**What:** Applying Tailwind `transition-*` or `animate-*` classes to elements that also use Motion's `animate`, `initial`, or `whileHover` props.
**Why bad:** Causes stuttering, double animations, or animations that fight each other. Tailwind's CSS transitions and Motion's JavaScript-driven animations compete for the same properties.
**Instead:** Use Tailwind for static styling only. Use Motion for all animation. If an element has Motion props, strip all Tailwind transition/animate classes from it.

## Scalability Considerations

| Concern | At 100 users/day | At 10K users/day | At 1M users/day |
|---------|-------------------|-------------------|-------------------|
| **Cloud Run instances** | 0-1 instances, min-instances=0 is fine | 1-3 instances, set min-instances=1 to avoid cold starts | 10-50 instances, need min-instances=3+ |
| **Cloud SQL cache** | Single queries, no contention | Connection pooling important (already using SQLAlchemy pool) | Need read replicas or migrate to Memorystore |
| **openFDA rate limits** | Not a concern (240/min with key) | Cache hit ratio must be >80% to stay under limits | Must proxy all FDA calls through backend with queue |
| **Gemini API costs** | Minimal | Per-analysis cost adds up, must enforce cache | Mandatory cache + rate limiting per user |
| **Cold starts** | Acceptable (3-5s for Python) | Set min-instances=1, enable startup CPU boost | Pre-warmed instances, consider lighter framework |
| **SEO/Sharing** | Template injection for OG tags sufficient | May need prerendering service for search engine indexing | Full SSR or prerendering pipeline |
| **API key exposure** | Low risk, few users | Medium risk, refactor to backend proxy | Must proxy all calls through backend |

## Cloud Run Configuration Recommendations

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Region** | us-central1 | Lowest latency to Cloud SQL, matches existing config |
| **Memory** | 512Mi (start), increase if needed | Flask + Gunicorn + Gemini responses can be large |
| **CPU** | 1 | Sufficient for single-threaded Gunicorn workers |
| **Min instances** | 0 (start), 1 (after launch) | Save costs during development, avoid cold starts in production |
| **Max instances** | 10 | Prevent runaway costs |
| **Concurrency** | 80 (default) | Gunicorn workers handle concurrent requests |
| **Timeout** | 300s | Drug analysis can take 30-60s (multiple API calls) |
| **Startup CPU boost** | Enabled | Reduces cold start time for Python containers |
| **Allow unauthenticated** | Yes | Public consumer-facing app |

## Sources

- [Cloud Run General Development Tips](https://docs.cloud.google.com/run/docs/tips/general) -- HIGH confidence (official docs)
- [Cloud Run Secret Manager Integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets) -- HIGH confidence (official docs)
- [Cloud Run Service Identity Configuration](https://docs.cloud.google.com/run/docs/configuring/services/service-identity) -- HIGH confidence (official docs)
- [Cloud Run IAM Roles](https://docs.cloud.google.com/run/docs/reference/iam/roles) -- HIGH confidence (official docs)
- [IAM Best Practices for Service Accounts](https://docs.cloud.google.com/iam/docs/best-practices-service-accounts) -- HIGH confidence (official docs)
- [Container Registry to Artifact Registry Migration](https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr) -- HIGH confidence (official docs)
- [openFDA API Authentication/Rate Limits](https://open.fda.gov/apis/authentication/) -- HIGH confidence (official docs)
- [Flask + React Router Deployment](https://blog.miguelgrinberg.com/post/how-to-deploy-a-react-router-flask-application) -- MEDIUM confidence (authoritative blog)
- [Motion + Tailwind CSS Integration](https://motion.dev/docs/react-tailwind) -- HIGH confidence (official docs)
- [Microservices vs Monolith 2026 Tradeoffs](https://www.javacodegeeks.com/2025/12/microservices-vs-monoliths-in-2026-when-each-architecture-wins.html) -- MEDIUM confidence (industry analysis)
- [SEO for React + Vite SPAs](https://dev.to/ali_dz/optimizing-seo-in-a-react-vite-project-the-ultimate-guide-3mbh) -- MEDIUM confidence (community guide)
- [Flask Prerendering for React SPAs](https://jeremylixandre.com/single-page-app-prerendering-with-flask/) -- MEDIUM confidence (community guide)
