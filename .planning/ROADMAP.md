# Roadmap: PharmKo

## Overview

PharmKo is a working drug safety analysis app being migrated from Replit to Google Cloud Run. The core analysis engine (FDA FAERS data + Gemini AI scoring) is functional. This roadmap delivers a production-ready, consumer-grade deployment: first by standing up the infrastructure and locking down security, then by polishing the core safety score card experience, enabling URL-based sharing, and adding engagement features that keep users coming back.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: GCP Foundation & Deployment** - Migrate from Replit to Cloud Run with proper infrastructure
- [ ] **Phase 2: Security Hardening** - Remove exposed endpoints and restrict access before public launch
- [ ] **Phase 3: Safety Score Card & Compliance** - Color-coded safety badge and medical disclaimer on analysis pages
- [ ] **Phase 4: Shareable Drug Pages** - URL-based drug analysis pages that auto-trigger without re-typing
- [ ] **Phase 5: Engagement Features** - Confidence scores, safety trends, and search history for retention

## Phase Details

### Phase 1: GCP Foundation & Deployment
**Goal**: The existing PharmKo app runs on Cloud Run with all backend services (Cloud SQL, auth, caching) working correctly in production
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. App builds and deploys via Cloud Build without errors, using Artifact Registry (not gcr.io)
  2. Cloud Run service runs under dedicated pharmko-cloudrun-sa service account with least-privilege roles
  3. All 32 secrets are injected via Cloud Run --set-secrets and accessible to the application at runtime
  4. Cloud SQL queries, authentication (email/password + Google/Facebook OAuth), and caching all work in the deployed app
  5. OAuth login redirects correctly to the Cloud Run URL (not the old Replit domain)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Fix backend code and Dockerfile for Cloud Run (ADC, PostgreSQL DDL, OAuth redirect)
- [x] 01-02-PLAN.md -- Rewrite Cloud Build pipeline for Artifact Registry + secret injection, create GCP setup script
- [ ] 01-03-PLAN.md -- Deploy, verify all services, update OAuth provider consoles

### Phase 2: Security Hardening
**Goal**: No API keys, admin endpoints, or database queries are exploitable by unauthenticated users
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. Browser network tab shows zero API keys in any response -- all external API calls (Gemini, etc.) are proxied through Flask server-side
  2. Visiting /api/auth/toggle or /api/auth/users without authentication returns 401/403
  3. The /api/gcloud/sql/query endpoint is either removed or returns 401/403 for non-admin users
  4. CORS headers only allow requests from the app's own origin, not wildcard (*)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Backend security: API proxy routes, CORS config, admin auth decorator, endpoint protection
- [ ] 02-02-PLAN.md -- Frontend refactor: use proxy routes instead of direct API calls, verify no keys in browser

### Phase 3: Safety Score Card & Compliance
**Goal**: Users see a clear, color-coded safety verdict at a glance and are informed this is not medical advice
**Depends on**: Phase 1
**Requirements**: UI-01, SEC-05
**Success Criteria** (what must be TRUE):
  1. After searching a drug, user sees a color-coded safety badge (green/yellow/orange/red) that immediately communicates risk level
  2. The color thresholds map to the existing weighted safety score in a way that matches intuition (e.g., aspirin = green, a drug with many severe adverse events = red)
  3. A prominent "not medical advice" disclaimer is visible on every drug analysis page without the user needing to scroll to find it
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Shareable Drug Pages
**Goal**: Users can share a URL that takes someone directly to a drug's safety analysis
**Depends on**: Phase 1, Phase 3
**Requirements**: SHARE-01
**Success Criteria** (what must be TRUE):
  1. Visiting /drug/metformin (or any valid drug slug) auto-triggers the safety analysis without the user needing to type the drug name
  2. The URL is human-readable and copy-pasteable (e.g., /drug/metformin, not /drug?id=abc123)
  3. A user can copy the URL from their browser bar and send it to someone, and the recipient sees the same drug analysis
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Engagement Features
**Goal**: Users get richer context about data reliability, safety trends over time, and can quickly revisit previous searches
**Depends on**: Phase 1, Phase 3
**Requirements**: ENGAGE-01, ENGAGE-02, ENGAGE-03
**Success Criteria** (what must be TRUE):
  1. After a drug analysis completes, user sees a data confidence score indicating how reliable the underlying data is (e.g., well-studied drug with thousands of reports vs. rare drug with few reports)
  2. User sees a safety trend indicator showing whether the drug's safety profile has been improving or worsening over recent reporting periods
  3. User's recently searched drugs appear on the home/search page for quick one-tap re-access without re-typing
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
(Phases 3, 4, 5 depend on Phase 1 but Phase 3 can run before Phase 2 completes if needed)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. GCP Foundation & Deployment | 1/3 | In Progress | - |
| 2. Security Hardening | 1/2 | In Progress | - |
| 3. Safety Score Card & Compliance | 0/2 | Not started | - |
| 4. Shareable Drug Pages | 0/1 | Not started | - |
| 5. Engagement Features | 0/2 | Not started | - |
