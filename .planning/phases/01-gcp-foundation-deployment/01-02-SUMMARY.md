---
phase: 01-gcp-foundation-deployment
plan: 02
subsystem: infra
tags: [cloud-build, artifact-registry, secret-manager, cloud-sql, gcp, iam, service-account]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - "Production-ready cloudbuild.yaml with Artifact Registry image refs and --set-secrets injection"
  - "GCP infrastructure setup script (scripts/gcp-setup.sh) for one-time resource provisioning"
affects: [01-03-PLAN, deployment, cloud-run]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Artifact Registry image refs (us-central1-docker.pkg.dev)", "Cloud Run --set-secrets for secret injection", "Dedicated service account with least-privilege IAM"]

key-files:
  created: [scripts/gcp-setup.sh]
  modified: [cloudbuild.yaml]

key-decisions:
  - "8 secrets mapped via --set-secrets; remaining secrets in Secret Manager are not referenced by app code"
  - "Cloud SQL instance uses db-f1-micro tier and HDD for cost minimization"
  - "Script does not include --root-password; user sets password separately for security"

patterns-established:
  - "Artifact Registry: all container images stored at us-central1-docker.pkg.dev/$PROJECT_ID/pharmko-repo"
  - "Secret injection: Cloud Run --set-secrets maps env var names to Secret Manager secret names"
  - "Infrastructure scripts: idempotent bash scripts with set -euo pipefail and existence checks"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-05]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 1 Plan 2: Cloud Build Pipeline & GCP Setup Summary

**Rewrote cloudbuild.yaml for Artifact Registry with --set-secrets injection for 8 secrets, dedicated service account, and created idempotent GCP infrastructure setup script**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T06:38:26Z
- **Completed:** 2026-03-13T06:40:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced all deprecated gcr.io image references with Artifact Registry (us-central1-docker.pkg.dev)
- Added --set-secrets for all 8 application secrets from Secret Manager
- Added --service-account for dedicated pharmko-cloudrun-sa with least-privilege IAM
- Added --set-env-vars for Cloud SQL config (instance, user, database, type) and AUTH_ENABLED
- Removed substitution variables and secret-creation build step (security anti-patterns)
- Created comprehensive GCP setup script covering APIs, Artifact Registry, service account, IAM, Cloud Build permissions, Cloud SQL, and secret verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite cloudbuild.yaml for Artifact Registry and secret injection** - `255a93f` (feat)
2. **Task 2: Create GCP infrastructure setup script** - `4ab3a38` (feat)

## Files Created/Modified
- `cloudbuild.yaml` - Cloud Build pipeline with 4 steps: build, push SHA, push latest, deploy to Cloud Run with full config
- `scripts/gcp-setup.sh` - One-time GCP infrastructure provisioning: APIs, Artifact Registry repo, service account, IAM roles, Cloud Build permissions, Cloud SQL instance, database, secret verification

## Decisions Made
- Mapped exactly 8 secrets via --set-secrets (the secrets the app code actually references), not all 32 in Secret Manager
- Used db-f1-micro tier for Cloud SQL to minimize cost per CONTEXT.md guidance
- Script prints instructions for password/user creation rather than embedding passwords in the script
- Used --quiet and output redirection on IAM binding commands to reduce noise from policy output

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** The user must run `scripts/gcp-setup.sh` before the first Cloud Build deployment:
- Authenticate gcloud CLI to pharmawatch-project1
- Run `chmod +x scripts/gcp-setup.sh && ./scripts/gcp-setup.sh`
- Set postgres root password: `gcloud sql users set-password postgres --instance=pharmko-db --password=YOUR_PASSWORD`
- Create SQL user and store password as cloud-sql-password secret
- Verify all 8 secret names exist in Secret Manager

## Next Phase Readiness
- cloudbuild.yaml is ready for deployment (Plan 3)
- GCP setup script must be run before first deployment
- Plan 1 (Dockerfile + backend fixes) should be completed before Plan 3 deploys

## Self-Check: PASSED

- FOUND: cloudbuild.yaml
- FOUND: scripts/gcp-setup.sh
- FOUND: 01-02-SUMMARY.md
- FOUND: 255a93f (Task 1 commit)
- FOUND: 4ab3a38 (Task 2 commit)

---
*Phase: 01-gcp-foundation-deployment*
*Completed: 2026-03-12*
