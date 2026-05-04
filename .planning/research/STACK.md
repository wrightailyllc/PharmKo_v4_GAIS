# Technology Stack

**Project:** PharmKo v4 - Cloud Run Migration & Consumer Polish
**Researched:** 2026-03-12

## Current Stack (Retained)

These technologies are already in the codebase and remain unchanged. No migration needed.

### Frontend Core (Existing - Keep)
| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| React | ^18.3.1 | UI framework | Keep as-is |
| TypeScript | ^5.2.2 | Type safety | Keep as-is |
| Vite | ^5.1.4 | Build tooling | Keep as-is |
| Tailwind CSS | ^4.1.17 | Utility-first styling | Keep as-is (v4 with CSS-first config) |
| react-router-dom | ^7.13.1 | Client-side routing | Keep as-is, already on v7 |
| react-helmet-async | ^3.0.0 | SEO meta tag management | Keep as-is |
| react-markdown | ^10.1.0 | Markdown rendering for AI reports | Keep as-is |
| jspdf + html2canvas | ^3.0.3 / ^1.4.1 | PDF export | Keep as-is |
| @google/genai | ^1.27.0 | Gemini AI integration | Keep as-is |
| vite-plugin-pwa | ^1.2.0 | PWA support | Keep as-is |

### Backend Core (Existing - Keep)
| Technology | Current Version | Purpose | Status |
|------------|----------------|---------|--------|
| Flask | 3.0.0 | Python web framework | Keep as-is |
| gunicorn | 22.0.0 | WSGI server for production | Keep as-is |
| flask-cors | 4.0.0 | CORS handling | Keep as-is |
| SQLAlchemy | 2.0.25 | Database ORM | Keep as-is |
| cloud-sql-python-connector | 1.18.0 | Cloud SQL secure connections | **Update to ^1.20.0** |
| google-cloud-storage | 2.14.0 | GCS integration | Keep as-is |

## New Stack Additions

### Frontend - Animation & Polish

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| motion | ^12.36.0 | UI animations, transitions, page entrance effects | The dominant React animation library (18M+ monthly npm downloads). Previously "framer-motion", now the independent "motion" package. Declarative API works perfectly with Tailwind -- use Tailwind for styling, Motion for animation. Supports layout animations, scroll-triggered effects, gesture handling, and exit animations. No other library matches its combination of DX, performance, and feature breadth for consumer-grade polish. | HIGH |

**Installation:**
```bash
npm install motion
```

**Why NOT react-spring:** Steeper learning curve (spring physics model), smaller community, fewer built-in features for consumer UX patterns (exit animations, layout transitions, gesture handling). React-spring is better for data-viz / physics simulations, not consumer UI polish.

**Why NOT GSAP:** Overkill for this use case. GSAP is designed for complex timeline-based animations (marketing sites, games). Adds complexity without benefit for a drug safety lookup tool. Also has licensing considerations for commercial use.

**Why NOT CSS-only animations (Tailwind v4 @starting-style):** Tailwind v4's new `@starting-style` and `transition-discrete` are great for simple entrance/hover effects, but insufficient for: coordinated multi-element animations, exit animations, layout morphing, scroll-triggered sequences, and gesture-based interactions. Use Tailwind transitions for simple hover/focus states, Motion for everything else.

### Frontend - Motion + Tailwind Integration Pattern

The key principle: **Tailwind handles styling, Motion handles animation.** A critical gotcha is that Tailwind's `transition-*` classes conflict with Motion's animation system. Never apply Tailwind transition classes to Motion-animated elements.

```tsx
// CORRECT: Tailwind for styling, Motion for animation
import { motion } from "motion/react";

<motion.div
  className="rounded-lg border p-4 bg-green-900/20 border-green-500/50"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {/* content */}
</motion.div>

// WRONG: Mixing Tailwind transitions with Motion
<motion.div
  className="transition-all duration-300"  // CONFLICT - remove this
  animate={{ opacity: 1 }}
/>
```

### Infrastructure - Cloud Run Service Account

| Technology | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Dedicated GCP Service Account | N/A | Cloud Run service identity | The default Compute Engine service account has Editor role on the entire project -- it can read every secret, delete any database, modify any resource. A dedicated service account with least-privilege IAM roles is a security requirement, not optional. | HIGH |

**Required IAM Roles for the dedicated service account:**

| Role | Resource Scope | Why |
|------|---------------|-----|
| `roles/secretmanager.secretAccessor` | Project-level (or per-secret) | Read Gemini API key, FDA API key, OAuth secrets from Secret Manager |
| `roles/cloudsql.client` | Project-level | Connect to Cloud SQL via Cloud SQL Python Connector |
| `roles/storage.objectAdmin` | Specific bucket | Read/write to GCS bucket for file storage |
| `roles/run.invoker` | N/A (only if service-to-service) | Not needed unless calling other Cloud Run services |

**Setup commands:**
```bash
# Create dedicated service account
gcloud iam service-accounts create pharmko-run-sa \
  --display-name="PharmKo Cloud Run Service Account" \
  --project=$PROJECT_ID

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:pharmko-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud SQL client access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:pharmko-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Grant Cloud Storage access (scoped to bucket)
gsutil iam ch \
  serviceAccount:pharmko-run-sa@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://${BUCKET_NAME}

# Deploy with dedicated service account
gcloud run deploy pharmko-app \
  --service-account=pharmko-run-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --image=...
```

### Infrastructure - Artifact Registry Migration

| Technology | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Artifact Registry | N/A | Container image storage | Container Registry (gcr.io) was shut down March 18, 2025. The existing cloudbuild.yaml uses `gcr.io/$PROJECT_ID/pharmko-app` which will fail on a new project. Must migrate to Artifact Registry. For a new GCP project, use `pkg.dev` format directly. | HIGH |

**Current cloudbuild.yaml (broken for new projects):**
```yaml
# OLD - gcr.io no longer accepts new writes
- 'gcr.io/$PROJECT_ID/pharmko-app:$COMMIT_SHA'
```

**Updated format:**
```yaml
# NEW - Artifact Registry
- 'us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo/pharmko-app:$COMMIT_SHA'
```

**Setup:**
```bash
# Create Artifact Registry repository
gcloud artifacts repositories create pharmko-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="PharmKo container images"
```

### Infrastructure - Secret Manager (Environment Variables)

| Technology | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Cloud Run Secret Manager integration | Native | Mount secrets as env vars | The current backend reads secrets from `os.environ` (Replit pattern). Cloud Run can natively mount Secret Manager secrets as environment variables at deploy time -- no code changes needed. The current `get_secret()` function in `main.py` already reads from `os.environ`, so this is a drop-in solution. Secrets mounted as env vars are resolved at instance startup. | HIGH |

**Deploy command with secrets:**
```bash
gcloud run deploy pharmko-app \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,FDA_API_KEY=fda-api-key:latest" \
  --set-secrets="GOOGLE_OAUTH_CLIENT_ID=google-oauth-client-id:latest" \
  --set-secrets="FACEBOOK_APP_ID=facebook-app-id:latest,FACEBOOK_APP_SECRET=facebook-app-secret:latest" \
  --set-secrets="CLOUD_SQL_INSTANCE=cloud-sql-instance:latest,CLOUD_SQL_USER=cloud-sql-user:latest" \
  --set-secrets="CLOUD_SQL_PASSWORD=cloud-sql-password:latest,CLOUD_SQL_DATABASE=cloud-sql-database:latest"
```

This eliminates the need for `GOOGLE_APPLICATION_CREDENTIALS_JSON` -- Cloud Run's service identity handles authentication to Cloud SQL and GCS automatically via Application Default Credentials (ADC). The `gcloud_services.py` credential flow should be updated to try ADC first before falling back to explicit credentials.

### SEO - Dynamic Meta Tags via Flask

| Technology | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| Flask server-side meta injection | N/A (built into existing backend) | Inject drug-specific OG/meta tags for shareable URLs | For `/drug/metformin` to generate proper Open Graph previews when shared on social media, the Flask backend must inject drug-specific meta tags into the HTML before sending to the client. Social media crawlers (Facebook, Twitter, iMessage) do NOT execute JavaScript -- they only read the initial HTML. react-helmet-async handles in-browser meta tags but those are invisible to crawlers. | HIGH |

**Implementation approach -- modify `serve_react_app()` in `backend/main.py`:**

```python
import re

DRUG_META_TEMPLATE = """
<meta property="og:title" content="PharmKo - {drug_name} Safety Report" />
<meta property="og:description" content="AI-powered safety analysis for {drug_name}. See adverse events, clinical data, and safety scores backed by FDA data." />
<meta property="og:url" content="https://pharmko.app/drug/{drug_slug}" />
<meta property="og:type" content="article" />
<meta name="description" content="{drug_name} drug safety score and analysis - powered by FDA adverse event data and AI." />
<title>PharmKo - {drug_name} Safety Report</title>
"""

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    # ... existing static file serving logic ...

    # For drug pages, inject meta tags
    index_file = dist_path / "index.html"
    html_content = index_file.read_text()

    if path.startswith("drug/"):
        drug_slug = path.replace("drug/", "")
        drug_name = drug_slug.replace("-", " ").title()
        meta_tags = DRUG_META_TEMPLATE.format(
            drug_name=drug_name,
            drug_slug=drug_slug
        )
        html_content = html_content.replace("</head>", f"{meta_tags}</head>")

    return html_content, 200, {"Content-Type": "text/html"}
```

**Why NOT full SSR/Next.js:** The app is already built as a Flask + React SPA. Migrating to Next.js would be a full rewrite. Server-side meta tag injection solves the social sharing problem (the primary SEO need) without architectural changes.

**Why NOT prerender.io or Rendertron:** Adds infrastructure complexity (headless Chrome) for marginal gain. Google's crawler renders JavaScript natively (two-phase indexing). The main SEO concern is social media sharing previews, which server-side meta injection solves directly.

## Backend Dependency Updates

| Package | Current | Recommended | Why |
|---------|---------|-------------|-----|
| cloud-sql-python-connector | 1.18.0 | ^1.20.0 | Latest stable release (Jan 2026). Adds lazy refresh strategy beneficial for serverless (Cloud Run). |
| gunicorn | 22.0.0 | Keep | Stable, no significant changes needed |
| Flask | 3.0.0 | Keep | Stable on v3, no need to update |

## Updated Python requirements.txt

```
flask==3.0.0
python-dotenv==1.0.0
requests==2.31.0
flask-cors==4.0.0
google-cloud-storage==2.14.0
cloud-sql-python-connector==1.20.0
pymysql==1.1.0
pg8000==1.31.2
sqlalchemy==2.0.25
oauthlib==3.2.2
gunicorn==22.0.0
```

## Frontend Installation Commands

```bash
# New dependency for consumer polish
npm install motion

# Verify existing deps are up to date
npm update
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Animation | motion ^12.36.0 | react-spring | Steeper learning curve, fewer built-in consumer UX patterns (exit animations, layout morphing), smaller community |
| Animation | motion ^12.36.0 | GSAP | Overkill complexity, licensing concerns, designed for timeline/marketing animations not component transitions |
| Animation | motion ^12.36.0 | CSS-only (Tailwind v4) | Insufficient for exit animations, scroll-triggered effects, coordinated sequences, gesture handling |
| SEO | Flask meta injection | Next.js SSR | Full rewrite required, existing Flask backend already serves the SPA |
| SEO | Flask meta injection | Prerender.io | Extra cost, infrastructure overhead, unnecessary since Google crawls JS natively |
| SEO | Flask meta injection | Rendertron (self-hosted) | Requires running headless Chrome, adds complexity and memory overhead on Cloud Run |
| Container Registry | Artifact Registry (pkg.dev) | gcr.io on AR | gcr.io format still works via AR redirect, but pkg.dev is the forward-looking standard for new projects |
| Service Account | Dedicated SA | Default Compute Engine SA | Default SA has Editor role on entire project -- massive security risk |

## Sources

- [Google Cloud Run Service Identity docs](https://docs.cloud.google.com/run/docs/configuring/services/service-identity) - HIGH confidence
- [Google Cloud Run Secret Manager integration](https://docs.cloud.google.com/run/docs/configuring/services/secrets) - HIGH confidence
- [Cloud Run IAM roles](https://docs.cloud.google.com/run/docs/reference/iam/roles) - HIGH confidence
- [Secret Manager IAM access control](https://docs.cloud.google.com/secret-manager/docs/access-control) - HIGH confidence
- [Container Registry to Artifact Registry migration](https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr) - HIGH confidence
- [Container Registry shutdown announcement](https://www.chkk.io/blog/google-container-registry-deprecation) - HIGH confidence
- [Motion (formerly Framer Motion) official site](https://motion.dev/) - HIGH confidence
- [Motion for React docs](https://motion.dev/docs/react) - HIGH confidence
- [Motion + Tailwind integration guide](https://motion.dev/docs/react-tailwind) - HIGH confidence
- [Motion upgrade guide from framer-motion](https://motion.dev/docs/react-upgrade-guide) - HIGH confidence
- [React animation libraries comparison 2025](https://dev.to/raajaryan/react-animation-libraries-in-2025-what-companies-are-actually-using-3lik) - MEDIUM confidence
- [Cloud Run least-privilege service account guide](https://oneuptime.com/blog/post/2026-02-17-how-to-configure-cloud-run-to-use-a-custom-service-account-with-least-privilege-permissions/view) - MEDIUM confidence
- [Cloud SQL Python Connector](https://github.com/GoogleCloudPlatform/cloud-sql-python-connector) - HIGH confidence
- [React SPA SEO with Vite guide](https://dev.to/ali_dz/optimizing-seo-in-a-react-vite-project-the-ultimate-guide-3mbh) - MEDIUM confidence
- [Flask prerendering approach](https://jeremylixandre.com/single-page-app-prerendering-with-flask/) - MEDIUM confidence
