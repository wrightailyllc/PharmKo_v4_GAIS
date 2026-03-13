# Phase 1: GCP Foundation & Deployment - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the existing PharmKo app from Replit to Google Cloud Run with all backend services (Cloud SQL, authentication, caching) operational in production. The app must build via Cloud Build, run under a dedicated service account with least-privilege roles, inject all 32 secrets via Cloud Run --set-secrets, and have OAuth redirects pointing to the new Cloud Run URL.

</domain>

<decisions>
## Implementation Decisions

### Cutover strategy
- Brief maintenance window approach — take Replit offline, deploy to Cloud Run, verify, switch over
- App is in dev/demo stage, not serving real production users — reduces cutover risk
- Keep Replit as fallback for a short period after Cloud Run is verified working
- GCP project is partially set up — some services may need enabling (Cloud SQL, Secret Manager, Artifact Registry, Cloud Build)

### Database migration
- Fresh start on Cloud SQL — no critical data needs migrating from Replit
- PostgreSQL as the Cloud SQL engine (matches likely Replit setup and best ecosystem fit)
- Minimize cost on instance sizing — db-f1-micro or db-g1-small appropriate for current traffic level

### Domain & access
- Use default Cloud Run URL (*.run.app) for now — custom domain can be added later
- Public access from the start — no IAM restriction needed for testing
- Deploy to us-central1 region (lowest cost, broadest service availability)
- Use Cloud Run managed TLS — automatic HTTPS, no custom certificates needed

### Environment setup
- Production only — no separate staging environment (test locally before deploying)
- Deployments triggered by push to main branch via Cloud Build trigger
- cloudbuild.yaml stored in repo — version-controlled build configuration
- Auto-rollback to previous revision if new deployment fails health checks

### Claude's Discretion
- Cloud Build step details and optimization
- Dockerfile configuration and build caching
- Service account role selection (within least-privilege constraint)
- Secret Manager naming conventions and organization
- Cloud SQL connection method (Unix socket vs Cloud SQL Auth Proxy)
- Health check configuration and startup probe settings

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is that all 32 existing secrets must be injectable via Cloud Run --set-secrets, and all three backend services (Cloud SQL, auth with email/password + Google/Facebook OAuth, caching) must work identically to the Replit deployment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-gcp-foundation-deployment*
*Context gathered: 2026-03-12*
