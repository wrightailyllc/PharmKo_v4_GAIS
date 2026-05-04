# Phase 2: Security Hardening - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock down exposed API keys, admin endpoints, open SQL queries, and CORS so nothing is exploitable by unauthenticated users. All external API calls (Gemini, etc.) are proxied server-side. Admin endpoints require authentication. CORS restricted from wildcard to specific origins. The app remains fully public for regular users — security hardening is invisible to them.

</domain>

<decisions>
## Implementation Decisions

### Admin access policy
- Single admin user (the developer), not multi-user or role-based
- Authentication via Google OAuth (already wired up from Phase 1)
- Admin email stored in environment variable (ADMIN_EMAIL or similar) — not database
- Unauthenticated requests to admin endpoints return JSON 401/403 error, no redirect

### SQL endpoint (/api/gcloud/sql/query)
- Keep the endpoint but restrict to admin only (require Google OAuth + admin email match)
- Read-only: only SELECT queries allowed — block INSERT, UPDATE, DELETE, DROP, etc.
- Researcher should check codebase for any features that depend on this endpoint internally

### CORS configuration
- No external API consumers — only the app itself calls its own API
- Environment-specific config: loose in dev (allow localhost), strict in production (production domain only)
- Claude determines the specific allowed origins from the deployment setup (Cloud Run URL, custom domain if any)

### API key proxy
- Move all browser-exposed API keys (Gemini, etc.) to server-side proxy routes
- Slight latency increase from proxying is acceptable — don't over-optimize
- On proxy errors (e.g., Gemini API down): show user-friendly message ("Analysis temporarily unavailable"), no technical details exposed

### Claude's Discretion
- SQL query result size limits (reasonable default)
- How to respond when non-admin hits admin endpoints (404 vs 403 — security through obscurity vs honesty)
- CORS method restrictions (whether to restrict HTTP methods or just origins)
- Loading/error state details for proxied API calls
- Exact proxy route naming and structure

</decisions>

<specifics>
## Specific Ideas

- App must remain fully public for regular users — no login gates for searching/viewing drug analysis
- Admin auth is solely for protecting admin endpoints, not for user-facing features
- Friendly error messages when API proxy fails — no raw error details or stack traces visible to users

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-security-hardening*
*Context gathered: 2026-03-13*
