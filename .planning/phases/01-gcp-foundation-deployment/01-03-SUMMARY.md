---
phase: 01-gcp-foundation-deployment
plan: 03
subsystem: infra
tags: [deployment, cloud-run, verification, gcp-setup, oauth]

# Dependency graph
requires:
  - phase: 01-01
    provides: Cloud Run-ready backend code
  - phase: 01-02
    provides: cloudbuild.yaml and gcp-setup.sh
provides:
  - "Live PharmKo deployment on Cloud Run with all backend services verified"
  - "GCP infrastructure provisioned (Artifact Registry, SA, Cloud SQL, secrets)"
affects: [production]

# Tech tracking
tech-stack:
  added: []
  patterns: ["gcloud run deploy --source for initial deployment", "Cloud SQL PostgreSQL 15 on db-f1-micro"]

key-files:
  created: []
  modified: []

key-decisions:
  - "Used gcloud run deploy --source instead of gcloud builds submit due to Cloud Build API initialization issue"
  - "Restored deleted default Compute Engine SA (460663669978-compute) required by Cloud Build"
  - "Created placeholder OAuth secrets for initial deployment — to be updated when OAuth credentials are obtained"
  - "SQL user pharmko created with auto-generated password stored in cloud-sql-password secret"

patterns-established:
  - "Initial deployment: gcloud run deploy --source as fallback when gcloud builds submit has API issues"
  - "Secret naming: lowercase-hyphenated (gemini-api-key) mapped to UPPER_SNAKE env vars"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06]

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 1 Plan 3: Deploy & Verify Summary

**Deployed PharmKo to Cloud Run, verified all health endpoints pass, provisioned GCP infrastructure**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-13T14:10:00Z
- **Completed:** 2026-03-13T14:25:00Z
- **Tasks:** 3 (2 human checkpoints, 1 auto verification)
- **Files modified:** 0 (deployment-only plan)

## Accomplishments
- GCP infrastructure provisioned via scripts/gcp-setup.sh: APIs enabled, Artifact Registry repo created, SA with IAM roles, Cloud Build permissions, Cloud SQL PostgreSQL 15 instance
- Restored deleted default Compute Engine service account required for Cloud Build
- Created 8 secrets in Secret Manager (2 copied from existing, 1 SQL password, 4 OAuth placeholders, 1 GCS placeholder)
- Deployed to Cloud Run at https://pharmko-app-460663669978.us-central1.run.app
- All health endpoints verified:
  - /api/health → {"status":"healthy"}
  - /api/config → ready:true, sql_available:true, database_ready:true
  - /api/gcloud/sql/test → connected:true
  - Frontend → HTTP 200

## Task Completion

1. **Task 1: Run GCP setup script and trigger deployment** - Completed (human action)
2. **Task 2: Verify deployment health** - All 4 endpoints PASS
3. **Task 3: Update OAuth provider consoles** - Skipped (no OAuth credentials yet; placeholder secrets deployed)

## Cloud Run Service Details
- **URL:** https://pharmko-app-460663669978.us-central1.run.app
- **Service Account:** pharmko-cloudrun-sa@pharmawatch-project1.iam.gserviceaccount.com
- **Region:** us-central1
- **Cloud SQL Instance:** pharmawatch-project1:us-central1:pharmko-db (34.16.29.237)

## Deviations from Plan

### 1. Used gcloud run deploy --source instead of gcloud builds submit
- **Reason:** gcloud builds submit returned NOT_FOUND on the Cloud Build API endpoint due to deleted default Compute Engine SA
- **Resolution:** Restored SA via gcloud iam service-accounts undelete, used --source deploy as workaround
- **Impact:** Same result — app built and deployed successfully

### 2. OAuth console updates skipped
- **Reason:** User does not have Google/Facebook OAuth credentials yet
- **Resolution:** Placeholder secrets deployed; OAuth endpoints report configured but will fail actual login
- **Impact:** App is functional for non-OAuth features; OAuth login deferred

## Issues Encountered
- Default Compute Engine SA (460663669978-compute@developer.gserviceaccount.com) was previously deleted — restored via undelete
- Secret names in Secret Manager didn't match expected names — created new secrets with correct naming

## User Setup Still Required
- **Google OAuth:** Create OAuth client in Google Cloud Console, update google-oauth-client-id and google-oauth-client-secret secrets, add Cloud Run URL as redirect URI
- **Facebook OAuth:** Create app in Facebook Developer Console, update facebook-app-id and facebook-app-secret secrets, add Cloud Run URL as redirect URI

## Self-Check: PASSED

All verification endpoints return expected responses. Cloud Run service is live and serving traffic.

---
*Phase: 01-gcp-foundation-deployment*
*Completed: 2026-03-13*
