# Research Summary: PharmKo Cloud Run Migration & Consumer Polish

**Domain:** Consumer-facing pharmaceutical drug safety analysis app
**Researched:** 2026-03-12
**Overall confidence:** HIGH (infrastructure recommendations verified via official GCP docs; animation library verified via official docs; SEO patterns verified via multiple sources)

## Executive Summary

PharmKo is a functional drug safety analysis app built on React 18 + TypeScript + Vite + Tailwind CSS (frontend) and Flask + Python (backend), with Gemini AI integration and FDA FAERS data. The core analysis engine works. The migration from Replit to Google Cloud Run requires three categories of work: infrastructure modernization, security hardening, and consumer-grade polish.

The infrastructure migration is straightforward but has several silent landmines. The existing `cloudbuild.yaml` pushes to `gcr.io` which was shut down in March 2025 -- this must be updated to Artifact Registry before the first deployment attempt. The Dockerfile is missing critical backend files (`gcloud_services.py`, `auth_service.py`), causing Cloud SQL and auth to silently fail. The default Compute Engine service account has Editor-level access to the entire GCP project, which is a security incident waiting to happen -- a dedicated service account with four specific IAM roles is required.

For consumer polish, the primary new technology addition is the `motion` library (v12.36.0, formerly Framer Motion), which is the dominant React animation library with 18M+ monthly npm downloads. It integrates cleanly with Tailwind CSS as long as one strict rule is followed: never apply Tailwind `transition-*` classes to Motion-animated elements. The existing Tailwind v4 + React 18 stack is solid and does not need changes.

For SEO and shareability, the critical insight is that social media crawlers (Facebook, Twitter/X, iMessage, WhatsApp) do NOT execute JavaScript. PharmKo's `react-helmet-async` correctly manages meta tags in the browser, but those tags are invisible to social crawlers. Flask must inject Open Graph meta tags server-side for `/drug/*` routes before serving `index.html`. This is a lightweight modification to the existing `serve_react_app()` function, not a full SSR migration.

## Key Findings

**Stack:** Keep existing React 18 + Flask stack entirely. Add `motion` (^12.36.0) for animations. Migrate to Artifact Registry. Create dedicated service account with least-privilege IAM roles. Use Cloud Run native `--set-secrets` for secret injection.

**Architecture:** Single-container monolith on Cloud Run (Flask serving both API and React static assets). No microservices split. Flask injects OG meta tags for drug pages server-side.

**Critical pitfall:** The Dockerfile only copies `backend/main.py` (not `gcloud_services.py` or `auth_service.py`), causing Cloud SQL, auth, and caching to silently fail after deployment. This will look like a "working" app with all persistent features broken.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **GCP Foundation & Deployment** - Infrastructure must work before any features
   - Addresses: Artifact Registry setup, dedicated service account, Secret Manager integration, Dockerfile fixes, cloudbuild.yaml updates
   - Avoids: gcr.io shutdown failure, default SA security risk, missing backend modules, secrets in build logs

2. **Security Hardening** - Security before public access
   - Addresses: Remove exposed API key endpoints, protect admin endpoints, restrict CORS, add medical disclaimers
   - Avoids: API key theft, SQL injection via query endpoint, auth bypass via toggle endpoint, legal liability

3. **Core Visual Polish** - Consumer-grade UX with motion animations
   - Addresses: Color-coded safety scores, animated score reveals, mobile responsiveness, score breakdown visualization
   - Avoids: Motion + Tailwind transition conflicts

4. **Shareability & SEO** - Growth engine via word-of-mouth sharing
   - Addresses: Auto-trigger analysis from URL params, Flask OG meta tag injection, social preview cards, configurable BASE_URL
   - Avoids: Empty social previews, hardcoded domain, non-functional drug page URLs

5. **Engagement & Optimization** - Retention and performance
   - Addresses: Confidence score display, safety trends, search history, in-process caching
   - Avoids: openFDA rate limit exhaustion at scale

**Phase ordering rationale:**
- Phase 1 must come first because nothing else works without a working deployment
- Phase 2 before any public launch because exposed endpoints are exploitable
- Phase 3 before Phase 4 because visual polish makes the app worth sharing
- Phase 4 depends on Phase 1 (needs stable URL) and Phase 3 (needs polished content to share)
- Phase 5 can run in parallel with Phase 4 or after

**Research flags for phases:**
- Phase 1: Standard GCP patterns, well-documented, unlikely to need deeper research
- Phase 2: Security hardening is well-understood; BFF refactor for API keys may need separate research on optimal Flask proxy patterns for Gemini streaming
- Phase 3: motion library integration is well-documented; verify Tailwind v4 + motion interop with actual code testing
- Phase 4: Flask meta tag injection is straightforward; test actual social crawler behavior with validator tools (Facebook Debugger, Twitter Card Validator)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified via official docs. motion library version confirmed via npm. Artifact Registry migration confirmed via Google shutdown notice. |
| Features | MEDIUM-HIGH | Table stakes validated via competitor analysis. Differentiators based on codebase capabilities. Anti-features aligned with PROJECT.md constraints. |
| Architecture | HIGH | Single-container monolith pattern verified in existing Dockerfile. Cloud Run configuration verified via official docs. Flask meta injection is a standard SPA pattern. |
| Pitfalls | HIGH | All critical pitfalls directly observed in codebase review. Infrastructure pitfalls verified via official Google deprecation notices. |

## Gaps to Address

- **Gemini streaming via Flask proxy:** When refactoring to move Gemini calls server-side (security fix), need to research Flask streaming responses to maintain the progressive loading UX. The current frontend shows real-time analysis progress. Phase-specific research needed.
- **OG image generation:** For truly compelling social previews, an auto-generated image showing the drug name + safety score would be ideal. This requires either a static template with text overlay or a dynamic image generation service. Defer to Phase 4 research.
- **Custom domain setup:** Deferred per PROJECT.md, but when ready, need to research Cloud Run custom domain mapping + SSL certificate provisioning + OAuth redirect URI updates.
- **Tailwind v4 configuration verification:** The project has both `tailwind.config.js` (v3 style) and Tailwind v4 as a dependency. Need to verify during implementation which configuration method is actually active.
- **Cloud SQL connection pooling at scale:** Current SQLAlchemy pool settings (`pool_pre_ping=True, pool_recycle=300`) are appropriate for low traffic. If traffic grows beyond 10K daily users, connection pooling strategy needs revisiting.
