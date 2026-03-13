# Domain Pitfalls

**Domain:** Consumer-facing pharmaceutical drug safety analysis app (Replit-to-Cloud Run migration)
**Project:** PharmKo
**Researched:** 2026-03-12

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, legal exposure, or major production outages.

---

### Pitfall 1: API Keys Exposed to Browser via Secret Proxy Endpoints

**What goes wrong:** The current Flask backend has `/api/secrets/gemini-key` and `/api/secrets/fda-key` endpoints that return raw API keys to the frontend as JSON. Anyone can open their browser's Network tab (or `curl` the endpoint) and harvest both the Gemini and FDA API keys. These keys then get used in client-side JavaScript to call external APIs directly. On Replit this was somewhat obscured, but on a public Cloud Run URL it becomes a fully exploitable vulnerability.

**Why it happens:** The original Replit architecture treated the backend as a "secrets vault" that proxies keys to the frontend. This is a common pattern in quick prototyping but is fundamentally insecure for production because frontends are public clients -- any secret sent to the browser is a secret shared with every user and every attacker.

**Consequences:**
- Gemini API key abuse (billing on your GCP account for attackers' usage)
- FDA API key revocation if someone hammers openFDA through your key (120,000 requests/day limit)
- Potential data exfiltration through the exposed Cloud SQL query endpoint (`/api/gcloud/sql/query` accepts arbitrary SELECT queries)
- The `/api/auth/toggle` endpoint lets anyone disable authentication via an unauthenticated POST request

**Prevention:**
- Move ALL external API calls (Gemini, openFDA) to the Flask backend. The frontend should never see API keys.
- Implement the Backend-for-Frontend (BFF) pattern: frontend calls `/api/analyze-drug`, backend calls Gemini and openFDA internally.
- Remove the `/api/secrets/*` endpoints entirely.
- Add authentication to admin endpoints (`/api/auth/toggle`, `/api/auth/users`, `/api/gcloud/sql/query`).
- Add rate limiting to all public endpoints.

**Detection:**
- Open browser DevTools > Network tab on the running app. If you see API keys in any response body, this pitfall is active.
- Search codebase for `fetch.*secrets` or `api/secrets` in frontend code.
- Check if `/api/gcloud/sql/query` is accessible without authentication.

**Phase:** Must be resolved in Phase 1 (infrastructure/migration) before any public deployment.
**Confidence:** HIGH -- directly observed in codebase review.

---

### Pitfall 2: Container Registry (gcr.io) Is Shut Down

**What goes wrong:** The current `cloudbuild.yaml` pushes images to `gcr.io/$PROJECT_ID/pharmko-app`. Google Container Registry was shut down on March 18, 2025. Image pushes to gcr.io fail. The build pipeline is broken from day one on a fresh GCP project.

**Why it happens:** The cloudbuild config was written when gcr.io was still active. Since PharmKo was on Replit (not actively deploying to GCP), nobody noticed the deprecation.

**Consequences:**
- Cloud Build fails immediately on first deployment attempt.
- Wasted debugging time if the team doesn't know about the gcr.io shutdown.

**Prevention:**
- Create an Artifact Registry repository: `gcloud artifacts repositories create pharmko-repo --repository-format=docker --location=us-central1`
- Update `cloudbuild.yaml` to use Artifact Registry: change `gcr.io/$PROJECT_ID/pharmko-app` to `us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app`.
- Update the `images` section at the bottom of `cloudbuild.yaml` correspondingly.

**Detection:**
- `grep -r "gcr.io" cloudbuild.yaml` -- if it returns results, this pitfall is active.
- First Cloud Build run will fail with a push error.

**Phase:** Phase 1 (infrastructure setup). Must fix before first deployment.
**Confidence:** HIGH -- confirmed via [Google official docs](https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr): Container Registry shut down March 18, 2025.

---

### Pitfall 3: AI-Generated Health Content Without Adequate Disclaimers Creates Legal Liability

**What goes wrong:** PharmKo uses Gemini to generate drug safety analysis reports that consumers act on for personal health decisions. Without prominent, well-structured disclaimers, the app could face legal liability when:
- Gemini hallucinates fabricated adverse events, drug interactions, or safety scores
- Users make medication decisions (stopping or starting drugs) based on AI-generated analysis
- A user suffers harm that they attribute to PharmKo's safety assessment

**Why it happens:** Health information apps occupy a regulatory gray area. PharmKo is not a medical device (does not diagnose or treat), but it makes safety claims about drugs that directly influence health decisions. The FTC requires health-related claims to be "truthful and well substantiated." AI hallucinations are by definition not substantiated.

**Consequences:**
- FTC enforcement action for unsubstantiated health claims
- Personal injury lawsuits if users change medication based on incorrect AI analysis
- App store rejection (Google Play now requires health apps without FDA clearance to include disclaimers)
- Reputational destruction if PharmKo is associated with a bad health outcome

**Prevention:**
- Add a persistent, prominent disclaimer on every report: "This information is for educational purposes only and is not medical advice. Always consult your healthcare provider before making medication decisions."
- Display the disclaimer BEFORE the safety score, not buried at the bottom.
- Label all AI-generated content clearly: "AI-Generated Analysis" with a visual indicator.
- Never use language like "safe" or "dangerous" as absolute statements -- use "based on reported adverse events" language.

**Detection:**
- No disclaimer visible on the report display page.
- Gemini prompts that do not include instructions to caveat its analysis.
- Safety scores presented without source attribution.

**Phase:** Phase 1 or Phase 2 (before any public/consumer-facing launch). Non-negotiable for consumer release.
**Confidence:** HIGH -- FTC guidance, Google Play 2026 requirements, and active Gemini litigation all confirm this risk.

---

### Pitfall 4: Cold Start + Cloud SQL Connection Timeout Kills First User Experience

**What goes wrong:** Cloud Run scales to zero by default. When a user visits PharmKo after idle time, the container cold-starts (Python + gunicorn initialization), then attempts to connect to Cloud SQL via the Cloud SQL Python Connector. This connection setup (TLS handshake, IAM auth, socket creation) adds 2-8 seconds to the first request. Meanwhile the frontend shows a spinner and times out, or the user sees a broken state because `/api/auth/status` and `/api/config` both fail.

**Why it happens:**
- The current Dockerfile uses `gunicorn --bind 0.0.0.0:8080 main:app` without `--timeout 0` (gunicorn default timeout is 30s, but Cloud Run has its own timeout which can conflict).
- `main.py` initializes Cloud SQL connection eagerly at import time (`initialize_cache_table()` runs on startup).
- The Cloud SQL Connector handshake can take 3-5 seconds on cold start.
- 512Mi memory allocation may be insufficient for Python + gunicorn + Cloud SQL connector + Google Cloud libraries.

**Prevention:**
- Set minimum instances to 1 (`--min-instances 1`) to eliminate cold starts. Cost is approximately $5-15/month.
- Update gunicorn command: `gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app` (per Google's official Python optimization guide).
- Update cloud-sql-python-connector to v1.20.0 for lazy refresh strategy support.
- Lazy-initialize Cloud SQL connections (don't call `initialize_cache_table()` on startup -- do it on first request).
- Increase memory to at least 1Gi.

**Detection:**
- Deploy to Cloud Run, wait 15+ minutes, then visit the URL. If it takes more than 3 seconds to load, this pitfall is active.
- Check Cloud Run logs for `WORKER TIMEOUT` or Cloud SQL connection errors on cold starts.

**Phase:** Phase 1 (deployment configuration). Critical for user experience.
**Confidence:** HIGH -- confirmed via Google official docs and multiple documented cases.

---

### Pitfall 5: OAuth Redirect URIs Break on Cloud Run URL Change

**What goes wrong:** The auth system currently hardcodes `REPLIT_DEV_DOMAIN` for Google OAuth redirect URIs (line 272 of `main.py`). When migrating to Cloud Run, the URL changes to something like `pharmko-app-xxxxx-uc.a.run.app`. Google OAuth Console requires exact redirect URI matches -- a single character difference causes `redirect_uri_mismatch` errors.

**Why it happens:**
- The code uses `REPLIT_DEV_DOMAIN` which won't exist on Cloud Run.
- Cloud Run generates URLs based on service name, project hash, and region.
- Google and Facebook OAuth both require exact redirect URI matching.

**Consequences:**
- Google OAuth login completely broken after migration.
- Facebook OAuth login completely broken after migration.
- Users who previously authenticated via OAuth cannot log back in.

**Prevention:**
- Replace `REPLIT_DEV_DOMAIN` with an `APP_BASE_URL` environment variable set in Cloud Run deployment config.
- Build redirect URI dynamically from the request's `Host` header: `redirect_uri = f"https://{request.host}/auth/google/callback"`.
- Register the Cloud Run URL in both Google Cloud Console and Facebook Developer Portal OAuth settings.

**Detection:**
- Search for `REPLIT_DEV_DOMAIN` in codebase. If found, this pitfall is active.
- Attempt Google OAuth login after Cloud Run deployment. If it fails with `redirect_uri_mismatch`, this pitfall is active.

**Phase:** Phase 1 (migration). Must fix before OAuth can work on Cloud Run.
**Confidence:** HIGH -- directly observed `REPLIT_DEV_DOMAIN` reference in `main.py` line 272.

---

## Moderate Pitfalls

Issues that cause significant user experience problems, unexpected costs, or ongoing operational headaches.

---

### Pitfall 6: Missing gcloud_services.py and auth_service.py in Dockerfile COPY

**What goes wrong:** The Dockerfile only copies `backend/main.py` to the container (`COPY backend/main.py ./`). It does NOT copy `backend/gcloud_services.py` or `backend/auth_service.py`. This means:
- Cloud SQL integration silently fails (the `ImportError` catch makes it degrade gracefully but non-functionally)
- Authentication service silently fails
- Caching silently fails
- The app appears to work but all persistent features are broken

**Why it happens:** The Dockerfile was likely written before the gcloud and auth modules were added, and never updated. Because the code uses try/except for all imports, the failure is silent.

**Prevention:**
- Change `COPY backend/main.py ./` to `COPY backend/ ./backend/` or explicitly copy all files.
- Add a startup health check that verifies Cloud SQL connectivity and fails loudly if modules are missing.

**Detection:**
- Review Dockerfile for missing COPY instructions.
- After deployment, hit `/api/config` and check if `gcloud.sql_available` is false despite correct env vars.

**Phase:** Phase 1 (infrastructure). The deployment literally doesn't work correctly without this fix.
**Confidence:** HIGH -- directly observed in Dockerfile review.

---

### Pitfall 7: SPA Client-Side Routing Breaks SEO and Shareability

**What goes wrong:** PharmKo is a React SPA using React Router. The route `/drug/metformin` exists in the React router but social media crawlers (Facebook, Twitter/X, iMessage, WhatsApp, LinkedIn) see an empty `<div id="root">` because Flask serves the same `index.html` for all routes with no pre-rendered content or drug-specific meta tags.

**Prevention:**
- Implement server-side meta tag injection: Flask detects `/drug/<slug>` routes and injects drug-specific `<title>`, `<meta description>`, and Open Graph tags into the HTML before serving.
- react-helmet-async handles in-browser meta tags (which works for Google's JS-executing crawler) but is invisible to social media crawlers.
- Add a `sitemap.xml` with known drug URLs.

**Detection:**
- Share a drug URL on Twitter/iMessage. If the link preview is generic "PharmKo" instead of "Metformin Safety Report - PharmKo", this pitfall is active.

**Phase:** Phase 2-3 (consumer polish / SEO). Not a blocker for launch but a blocker for growth.
**Confidence:** HIGH -- well-documented limitation of all React SPAs.

---

### Pitfall 8: Motion + Tailwind Transition Class Conflicts

**What goes wrong:** When adding the `motion` animation library for consumer polish, developers instinctively apply Tailwind CSS `transition-*` or `animate-*` classes to elements that also use Motion's `animate`, `initial`, or `whileHover` props. This causes stuttering, double animations, or animations that fight each other because both systems try to control the same CSS properties.

**Why it happens:** Tailwind's utility classes like `transition-all duration-300` apply CSS transitions. Motion applies JavaScript-driven transforms. When both target the same property (e.g., opacity, transform), they compete.

**Prevention:**
- Establish a strict team rule: if an element has any Motion props (`initial`, `animate`, `whileHover`, `whileInView`, `exit`), strip ALL Tailwind `transition-*` and `animate-*` classes from it.
- Use Tailwind exclusively for static styling (colors, spacing, typography, borders).
- Use Motion exclusively for animation (entrance, exit, hover, scroll, layout).
- Add this rule as a code review checklist item.

**Detection:**
- Search for elements with both `className="*transition*"` and Motion props.
- Visual: animations look stuttery or "fight" each other.

**Phase:** Phase 3 (frontend polish). When adding motion animations.
**Confidence:** HIGH -- [documented in official Motion + Tailwind docs](https://motion.dev/docs/react-tailwind).

---

### Pitfall 9: CORS Misconfiguration in Production

**What goes wrong:** The current code uses `CORS(app, supports_credentials=True)` with no origin restrictions. This allows any website to make authenticated requests to the PharmKo API.

**Prevention:**
- Since Flask and React are served from the same origin in production (same Cloud Run container), CORS is not needed for same-origin requests.
- Conditionally enable CORS only in development: `if os.environ.get("FLASK_ENV") == "development": CORS(app)`.

**Phase:** Phase 1 (migration/security hardening).
**Confidence:** HIGH -- directly observed in codebase review.

---

### Pitfall 10: Unprotected Admin and Database Endpoints

**What goes wrong:** Several sensitive endpoints have no authentication:
- `/api/auth/toggle` (POST) -- allows anyone to disable authentication
- `/api/auth/users` (GET) -- exposes the full user list including emails
- `/api/gcloud/sql/query` (POST) -- allows arbitrary SELECT queries
- `/api/gcloud/storage/*` -- allows file upload/delete/list on the GCS bucket

**Prevention:**
- Add `@require_auth` plus admin role check to all admin endpoints.
- Remove `/api/gcloud/sql/query` entirely -- it's a SQL injection vector.
- Remove or restrict `/api/auth/toggle` to CLI or admin-only interface.

**Phase:** Phase 1 (security hardening). Must fix before public deployment.
**Confidence:** HIGH -- directly observed in codebase review.

---

### Pitfall 11: /drug/:drugSlug Route Doesn't Auto-Trigger Analysis

**What goes wrong:** The DashboardPage component currently requires the user to type a drug name and click "Analyze." When someone visits `/drug/metformin` directly (from a shared link), they see an empty dashboard instead of an auto-triggered analysis.

**Prevention:** Add `useParams()` to read `drugSlug` and `useEffect()` to auto-trigger `handleAnalyze(drugSlug)` on mount when the param is present.

**Detection:** Visit `/drug/metformin` directly -- if you see an empty search form instead of an analysis, this pitfall is active.

**Phase:** Phase 2-3 (shareability). Required for shareable URLs to work.
**Confidence:** HIGH -- observable in `DashboardPage.tsx` (does not use `useParams`).

---

### Pitfall 12: SEOHead Component Hardcodes pharmko.app Domain

**What goes wrong:** The `SEOHead.tsx` component hardcodes `const BASE_URL = 'https://pharmko.app'` for canonical URLs. If deploying without a custom domain (using Cloud Run's default URL), all canonical URLs will point to a domain that doesn't exist yet, which confuses search engines.

**Prevention:** Make `BASE_URL` configurable via Vite environment variable (`import.meta.env.VITE_APP_URL`). Set it in `.env.production` or inject at build time.

**Phase:** Phase 2-3 (SEO). Quick fix.
**Confidence:** HIGH -- observable in `components/SEOHead.tsx` line 14.

---

## Minor Pitfalls

---

### Pitfall 13: openFDA API Rate Limits at Consumer Scale

**What goes wrong:** openFDA limits API calls to 240 requests/minute and 120,000/day per key. PharmKo makes multiple API calls per drug analysis. FAERS data updates quarterly, not real-time, but the app presents data as current.

**Prevention:**
- The existing 30-day Cloud SQL cache helps but add in-process TTLCache for hot queries.
- Add "Data last updated: [date]" label on reports.
- Pre-fetch top 100 most prescribed drugs.

**Phase:** Phase 3 (optimization).
**Confidence:** HIGH -- openFDA rate limits confirmed via [official documentation](https://open.fda.gov/apis/authentication/).

---

### Pitfall 14: MySQL/PostgreSQL Syntax Conflict in Database Schema

**What goes wrong:** `gcloud_services.py` supports both MySQL and PostgreSQL via `CLOUD_SQL_TYPE` env var, but cache table schema uses MySQL-specific syntax (`AUTO_INCREMENT`, `ENGINE=InnoDB`, `ON UPDATE CURRENT_TIMESTAMP`). PostgreSQL will fail.

**Prevention:** Pick one database type and commit to it. MySQL is the current default -- remove the PostgreSQL code path or write compatible schemas.

**Phase:** Phase 1 (infrastructure). Quick fix during migration.
**Confidence:** HIGH -- directly observed incompatible SQL syntax.

---

### Pitfall 15: Cloud Build Secrets in Substitution Variables

**What goes wrong:** The `cloudbuild.yaml` uses substitution variables `_GEMINI_API_KEY` and `_FDA_API_KEY` to create secrets, but these are visible in Cloud Build logs and trigger configuration UI.

**Prevention:**
- Create secrets manually via `gcloud secrets create` before the first build.
- Remove the secret-creation step from `cloudbuild.yaml`.
- Use Cloud Run's native `--set-secrets` for runtime secret mounting.

**Phase:** Phase 1 (infrastructure).
**Confidence:** HIGH -- directly observed in cloudbuild.yaml.

---

### Pitfall 16: Tailwind v4 Configuration Ambiguity

**What goes wrong:** The project has both `tailwind.config.js` (v3 style) and Tailwind v4 (`^4.1.17` in package.json). Tailwind v4 uses CSS-first configuration via `@theme` blocks, not JavaScript config files. The old config file may be ignored or cause confusion.

**Prevention:** Verify which configuration method is actually being used by checking `postcss.config.js` and `index.css`. If Tailwind v4 is working with the JS config via the PostCSS plugin, keep it consistent.

**Phase:** Phase 2 (frontend polish). Low priority but clean up during animation work.
**Confidence:** MEDIUM -- depends on exact PostCSS plugin configuration.

---

### Pitfall 17: gunicorn Single-Worker Default

**What goes wrong:** The Dockerfile runs `gunicorn --bind 0.0.0.0:8080 main:app` with default workers (1 sync worker). Only one request can be processed at a time per instance despite Cloud Run's default concurrency of 80.

**Prevention:** Add `--workers=2 --threads=4` or use `--worker-class=gthread` for threaded workers.

**Phase:** Phase 1 (deployment configuration).
**Confidence:** MEDIUM -- depends on actual traffic patterns.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| GCP Project Setup | gcr.io shutdown breaks image push | Use Artifact Registry (`us-central1-docker.pkg.dev`) from day one |
| GCP Project Setup | Forgetting to enable required APIs | Script: enable Cloud Run, Build, Secret Manager, SQL, Storage, Artifact Registry APIs |
| Dockerfile | Missing backend modules (gcloud_services.py, auth_service.py) | Copy entire `backend/` directory |
| Cloud Run Deploy | Default service account has Editor role | Create dedicated `pharmko-run-sa` with 4 specific roles |
| Cloud Run Deploy | Cold start + Cloud SQL timeout | Min instances = 1, lazy DB init, increase memory to 1Gi |
| Cloud Run Deploy | Gunicorn single-worker bottleneck | Use `--workers 2 --threads 4 --timeout 0` |
| Secret Management | API keys exposed via `/api/secrets/*` endpoints | Move API calls to backend, remove secret proxy endpoints |
| Secret Management | Build-time secrets in Cloud Build logs | Use Secret Manager + `--set-secrets` runtime mounting |
| OAuth Migration | REPLIT_DEV_DOMAIN breaks redirect URIs | Use request.host for dynamic redirect URI construction |
| CORS Config | Wildcard CORS allows cross-origin attacks | Restrict to specific origins or disable in production |
| Admin Endpoints | No auth on sensitive endpoints | Add auth + admin role checks, remove SQL query endpoint |
| Health Disclaimers | No medical disclaimer on AI-generated content | Add prominent disclaimer before score, label AI content |
| Frontend Animation | motion + Tailwind transition class conflicts | Strict rule: motion elements must NOT have Tailwind transition classes |
| SEO / Shareability | SPA renders empty HTML for social crawlers | Flask server-side OG meta tag injection for `/drug/*` routes |
| SEO / Shareability | SEOHead.tsx hardcodes pharmko.app domain | Make BASE_URL configurable via env var |
| Drug Page URLs | DashboardPage doesn't auto-trigger from URL params | Add useParams() + useEffect() auto-trigger |
| FDA Data | Rate limits at consumer scale | Aggressive caching, pre-fetch popular drugs |
| Database Schema | MySQL/PostgreSQL syntax conflict | Pick one DB type, ensure schema consistency |

---

## Sources

- openFDA API Authentication/Rate Limits (HIGH confidence): https://open.fda.gov/apis/authentication/
- Google Container Registry Shutdown (HIGH confidence): https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Run Secrets Configuration (HIGH confidence): https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run Service Identity (HIGH confidence): https://docs.cloud.google.com/run/docs/configuring/services/service-identity
- IAM Best Practices for Service Accounts (HIGH confidence): https://docs.cloud.google.com/iam/docs/best-practices-service-accounts
- Motion + Tailwind CSS Integration (HIGH confidence): https://motion.dev/docs/react-tailwind
- Cloud Run Cold Start Mitigation (HIGH confidence): https://cloud.google.com/blog/topics/developers-practitioners/3-ways-optimize-cloud-run-response-times
- Flask SPA Prerendering (MEDIUM confidence): https://jeremylixandre.com/single-page-app-prerendering-with-flask/
- React SPA SEO Challenges (MEDIUM confidence): https://www.creolestudios.com/how-to-make-react-website-seo-friendly/
- PharmKo codebase review: `backend/main.py`, `backend/gcloud_services.py`, `Dockerfile`, `cloudbuild.yaml`, `App.tsx`, `DashboardPage.tsx`, `SEOHead.tsx` (HIGH confidence -- direct code inspection)
