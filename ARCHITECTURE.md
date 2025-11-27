# Architecture Overview

## System Architecture Diagram

### Local Development Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Your Computer                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   Frontend (React)   │      │  Backend (Flask)     │    │
│  │  http://localhost    │      │  http://localhost    │    │
│  │      :5173           │◄────►│      :5000           │    │
│  │                      │      │                      │    │
│  │  • App.tsx           │      │  • main.py           │    │
│  │  • Components        │      │  • Secret Manager    │    │
│  │  • Services          │      │    Client            │    │
│  └──────────────────────┘      └──────────────────────┘    │
│         │                              │                    │
│         │                              │                    │
│         │                              ▼                    │
│         │                    ┌──────────────────┐          │
│         │                    │  Environment Var │          │
│         │                    │ GEMINI_API_KEY   │          │
│         │                    │ FDA_API_KEY      │          │
│         │                    └──────────────────┘          │
│         │                    (For local dev)               │
│         │                                                   │
│         └────────────────────►│                             │
│              HTTP                 Gemini/FDA APIs           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Production Architecture (Cloud Run)
```
┌────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Cloud Run Service                      │ │
│  │  ┌────────────────────┐      ┌────────────────────┐    │ │
│  │  │   Frontend         │      │   Backend          │    │ │
│  │  │   (Static React)   │      │   (Flask)          │    │ │
│  │  │                    │◄────►│                    │    │ │
│  │  │  • Served via      │      │  • Listens on 8080 │    │ │
│  │  │    Flask           │      │  • Secret Manager  │    │ │
│  │  │  • gzip/cache      │      │    Client          │    │ │
│  │  └────────────────────┘      └────┬───────────────┘    │ │
│  │                                    │                    │ │
│  │                                    ▼                    │ │
│  │                        ┌───────────────────────┐        │ │
│  │                        │   Secret Manager      │        │ │
│  │                        │   API Client          │        │ │
│  │                        │   (Authenticated via  │        │ │
│  │                        │    Service Account)   │        │ │
│  │                        └───────────┬───────────┘        │ │
│  │                                    │                    │ │
│  └────────────────────────────────────┼────────────────────┘ │
│                                       │                       │
│  ┌────────────────────────────────────▼────────────────────┐ │
│  │            Google Cloud Secret Manager                  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  gemini-api-key                                 │  │ │
│  │  │  ├─ Version 1 (current)                         │  │ │
│  │  │  ├─ Version 2 (previous)                        │  │ │
│  │  │  └─ Version 3 (even older)                      │  │ │
│  │  ├─ Encrypted at rest                              │  │ │
│  │  ├─ Access via IAM                                 │  │ │
│  │  └─ Audit logging enabled                          │  │ │
│  │                                                     │  │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  fda-api-key                                    │  │ │
│  │  │  ├─ Version 1 (current)                         │  │ │
│  │  │  ├─ Version 2 (previous)                        │  │ │
│  │  │  └─ Version 3 (even older)                      │  │ │
│  │  ├─ Encrypted at rest                              │  │ │
│  │  ├─ Access via IAM                                 │  │ │
│  │  └─ Audit logging enabled                          │  │ │
│  │                                                     │  │ │
│  └─────────────────────────────────────────────────────┘  │ │
│                                                             │ │
└─────────────────────────────────────────────────────────────┘ │
         │                                    │                 │
         │                                    │                 │
         └───────────┬────────────────────────┘                 │
                     │                                          │
                     ▼                                          │
         ┌──────────────────────────┐                           │
         │  External APIs           │                           │
         │  ├─ Gemini API           │                           │
         │  ├─ FDA API              │                           │
         │  ├─ RxNorm API           │                           │
         │  ├─ ClinicalTrials API   │                           │
         │  └─ Europe PMC API       │                           │
         └──────────────────────────┘                           │
                                                               │
└────────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline (Cloud Build)
```
┌──────────────┐
│   GitHub     │
│              │
│  main branch │
│   updated    │
└──────┬───────┘
       │
       │ webhook
       ▼
┌──────────────────────┐
│  Cloud Build Trigger │
│                      │
│  Read substitution   │
│  variables           │
│  - _GEMINI_API_KEY   │
│  - _FDA_API_KEY      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│   Cloud Build Steps          │
│                              │
│  1. Build Docker image       │
│     docker build             │
│     -t gcr.io/.../image      │
│                              │
│  2. Create secrets           │
│     gcloud secrets create    │
│     gemini-api-key           │
│     (if not exists)          │
│                              │
│  3. Grant permissions        │
│     gcloud secrets add-iam   │
│     --member=serviceAccount  │
│                              │
│  4. Push image               │
│     docker push              │
│     gcr.io/.../image         │
│                              │
│  5. Deploy to Cloud Run      │
│     gcloud run deploy        │
│     --image gcr.io/.../image │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Container Registry (GCR) │
│                          │
│ gcr.io/PROJECT/image     │
│ ├─ pharkomko-app:sha1    │
│ ├─ pharkomko-app:sha2    │
│ └─ pharkomko-app:latest  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│   Cloud Run Service      │
│                          │
│ pharmko-app              │
│ ├─ URL: https://...      │
│ ├─ Region: us-central1   │
│ ├─ Memory: 512Mi         │
│ ├─ Timeout: 300s         │
│ └─ Auto-scale: 0-100     │
└──────────────────────────┘
       │
       ▼ (Deployed!)
┌──────────────────────────┐
│  Users Access Service    │
│                          │
│  https://...run.app      │
│  ├─ Landing page         │
│  ├─ Drug analysis        │
│  └─ Reports              │
└──────────────────────────┘
```

### Secret Retrieval Flow (Sequence Diagram)
```
Frontend          Backend          Secret Manager    External APIs
   │                 │                  │                 │
   │  GET /api/      │                  │                 │
   │  health         │                  │                 │
   ├────────────────►│                  │                 │
   │                 │  return {"status"}                 │
   │◄────────────────┤                  │                 │
   │                 │                  │                 │
   │  GET /api/      │                  │                 │
   │  secrets/       │                  │                 │
   │  gemini-key     │                  │                 │
   ├────────────────►│                  │                 │
   │                 │  accessSecretVersion()              │
   │                 ├─────────────────►│                 │
   │                 │                  │  (authenticate  │
   │                 │                  │   via service   │
   │                 │                  │   account)      │
   │                 │  return API_KEY  │                 │
   │                 │◄─────────────────┤                 │
   │  {"api_key":    │                  │                 │
   │   "..."}        │                  │                 │
   │◄────────────────┤                  │                 │
   │  (cache key)    │                  │                 │
   │                 │                  │                 │
   │  Use key for    │                  │                 │
   │  Gemini API     ├────────────────────────────────────►│
   │  call           │                                     │
   │                 │                  │  API Response   │
   │                 │◄────────────────────────────────────┤
   │                 │                  │                 │
   │  Display        │                  │                 │
   │  results        │                  │                 │
   │                 │                  │                 │
```

## Data Flow

### Request Flow
1. **User interacts with Frontend**
   - Browser loads React app
   - User searches for drug

2. **Frontend requests secrets**
   - Calls: `GET /api/secrets/gemini-key`
   - Calls: `GET /api/secrets/fda-key`

3. **Backend retrieves secrets**
   - Uses service account credentials
   - Calls Secret Manager API
   - Caches in memory
   - Returns to frontend

4. **Frontend makes API calls**
   - Uses retrieved secrets
   - Calls Gemini API
   - Calls FDA API
   - Calls other data sources

5. **Results displayed**
   - Analysis complete
   - Report shown to user

### Security Flow
```
┌─ User Request ─┐
│                │
├─ Authenticate  ├─ Service Account
│                │  (built into Cloud Run)
├─ Check IAM     ├─ Service Account
│                │  has secret access permission?
├─ Encrypt TLS   ├─ All data encrypted
│                │  in transit
├─ Store Secret  ├─ Encrypted at rest
│                │  in Secret Manager
├─ Audit Log     ├─ Log all access
│                │  for compliance
└─ Return Data ──┘
```

## Component Relationships

```
Dependencies
└─ backend/main.py
   ├─ google.cloud.secretmanager
   ├─ flask
   ├─ flask_cors
   └─ requests

└─ frontend/services/secretManager.ts
   ├─ fetch API (native)
   ├─ local caching
   └─ error handling

└─ frontend/services/geminiService.ts
   ├─ @google/genai
   ├─ secretManager (dependency)
   └─ external APIs (RxNorm, FDA, etc.)
```

## Deployment Targets

### Local Development
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Database: None (uses external APIs)

### Staging (Optional)
- Frontend: `https://staging-app-...run.app`
- Backend: Same URL (served together)
- Database: None (uses external APIs)

### Production
- Frontend: `https://pharmko-app-...run.app`
- Backend: Same URL (served together)
- Database: None (uses external APIs)

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- CSS/Tailwind

### Backend
- Python 3.11
- Flask 3.0
- Google Cloud Secret Manager client
- CORS support

### Infrastructure
- Google Cloud Run (serverless containers)
- Google Cloud Secret Manager (secret storage)
- Google Cloud Build (CI/CD)
- Google Container Registry (image storage)
- Cloud Logging (logging)
- Cloud Monitoring (monitoring)

### APIs
- Google Gemini API (AI analysis)
- OpenFDA API (drug safety data)
- RxNorm API (drug identification)
- ClinicalTrials.gov API (trial data)
- Europe PMC API (research articles)

## Security Architecture

### Authentication & Authorization
```
Flow:
1. User accesses Cloud Run service
2. Cloud Run uses service account
3. Service account authenticated to Google Cloud
4. Service account has IAM role: secretmanager.secretAccessor
5. Can read secrets: gemini-api-key, fda-api-key
6. Secrets retrieved and passed to frontend
```

### Encryption
```
At Rest:
- Secrets encrypted in Secret Manager
- Database connections encrypted (if used)

In Transit:
- TLS/HTTPS enforced
- Secret Manager uses mTLS for API calls
- Frontend to backend: HTTPS (Cloud Run)
```

### Isolation
```
- Frontend cannot directly access Secret Manager
- Frontend cannot see secrets in localStorage/sessionStorage
- Secrets only in backend memory (per-request basis)
- Each request gets fresh secrets (no global state)
```

## Monitoring & Logging

### Application Logs
- Cloud Logging captures:
  - Request/response logs
  - Error logs
  - Application logs
  - Secret access logs (audit trail)

### Metrics
- Cloud Monitoring tracks:
  - Request count
  - Error rate
  - Response time
  - CPU/Memory usage

### Alerts (Optional)
- High error rate
- High latency
- Unauthorized secret access
- Deploy failures

---

**Visual Architecture Reference**
*For technical documentation, see IMPLEMENTATION.md*
