---
phase: 01-gcp-foundation-deployment
plan: 01
subsystem: infra
tags: [dockerfile, cloud-run, postgresql, adc, google-auth, gunicorn, oauth]

# Dependency graph
requires: []
provides:
  - Cloud Run-ready Dockerfile copying all backend modules
  - ADC credential fallback for gcloud_services.py
  - PostgreSQL-compatible caching DDL (SERIAL, JSONB, ON CONFLICT)
  - Dynamic OAuth redirect URI via request.host
  - Explicit google-auth dependency in requirements.txt
affects: [01-gcp-foundation-deployment]

# Tech tracking
tech-stack:
  added: [google-auth]
  patterns: [adc-fallback, postgresql-upsert, dynamic-redirect-uri]

key-files:
  created: []
  modified:
    - Dockerfile
    - backend/gcloud_services.py
    - backend/main.py
    - backend/requirements.txt

key-decisions:
  - "ADC fallback via google.auth.default() as final else branch, keeping explicit creds as priority"
  - "PostgreSQL ON CONFLICT with EXCLUDED references instead of parameterized UPDATE clause"
  - "request.scheme + request.host for OAuth redirect, removing all Replit-specific code"

patterns-established:
  - "ADC fallback: explicit creds > creds file > google.auth.default()"
  - "PostgreSQL upsert: ON CONFLICT (unique_col) DO UPDATE SET col = EXCLUDED.col"

requirements-completed: [INFRA-04, INFRA-06]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 1 Plan 1: Cloud Run Backend Fixes Summary

**Dockerfile multi-stage build copying all 3 backend modules, ADC credential fallback via google.auth.default(), PostgreSQL-compatible caching DDL, and dynamic OAuth redirect URI**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T06:38:22Z
- **Completed:** 2026-03-13T06:42:37Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Dockerfile now copies all three backend Python modules (main.py, gcloud_services.py, auth_service.py) and uses npm ci for deterministic builds
- gcloud_services.py falls back to ADC when no explicit credentials are set, enabling Cloud Run operation without GOOGLE_APPLICATION_CREDENTIALS_JSON
- All caching DDL converted from MySQL to PostgreSQL (SERIAL, JSONB, ON CONFLICT, EXTRACT/AGE)
- OAuth redirect URI uses request.scheme + request.host, removing REPLIT_DEV_DOMAIN dependency

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Dockerfile and requirements.txt** - `255a93f` (fix)
2. **Task 2: Fix gcloud_services.py for Cloud Run (ADC + PostgreSQL DDL)** - `aca4bf8` (fix)
3. **Task 3: Fix OAuth redirect URI in main.py** - `a6b3233` (fix)

## Files Created/Modified
- `Dockerfile` - Multi-stage build now copies all 3 backend modules, uses npm ci, configures gunicorn workers/timeout
- `backend/gcloud_services.py` - ADC fallback, PostgreSQL DDL (SERIAL, JSONB, ON CONFLICT, AGE), default postgresql type
- `backend/main.py` - Dynamic OAuth redirect via request.host, removed Replit references
- `backend/requirements.txt` - Added google-auth>=2.28.0, relaxed cloud-sql-python-connector version range

## Decisions Made
- Used google.auth.default() as third fallback in _get_credentials(), preserving explicit credentials as priority path
- Used EXCLUDED references in PostgreSQL ON CONFLICT clause (cleaner than re-referencing bind parameters)
- Used request.scheme + request.host for OAuth redirect (auto-adapts to Cloud Run, localhost, custom domains)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing return statement in _get_credentials() ADC branch**
- **Found during:** Task 2 (ADC credential fallback)
- **Issue:** The ADC else branch set _credentials but did not return it, causing the function to return None
- **Fix:** Added `return _credentials` after the if/elif/else block to handle the ADC code path
- **Files modified:** backend/gcloud_services.py
- **Verification:** Code flow analysis confirms all three branches now return credentials
- **Committed in:** aca4bf8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend code is now Cloud Run-compatible with ADC support and PostgreSQL DDL
- Ready for Plan 02 (cloudbuild.yaml and Cloud Build configuration) and Plan 03 (deployment)
- OAuth redirect will auto-adapt to whatever Cloud Run URL is assigned

## Self-Check: PASSED

All 4 modified files verified on disk. All 3 task commits verified in git log.

---
*Phase: 01-gcp-foundation-deployment*
*Completed: 2026-03-12*
