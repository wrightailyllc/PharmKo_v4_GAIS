# Requirements: PharmKo

**Defined:** 2026-03-12
**Core Value:** A worried patient can search any drug and immediately understand its safety profile through a clear, visual score card

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Cloud Run deployment uses Artifact Registry (us-central1-docker.pkg.dev) instead of deprecated gcr.io
- [ ] **INFRA-02**: Cloud Run service uses dedicated pharmko-cloudrun-sa service account with least-privilege IAM roles
- [ ] **INFRA-03**: All secrets injected via Cloud Run native --set-secrets from existing Secret Manager secrets
- [ ] **INFRA-04**: Dockerfile copies all backend modules (main.py, gcloud_services.py, auth_service.py) so Cloud SQL, auth, and caching work in production
- [ ] **INFRA-05**: cloudbuild.yaml updated for Artifact Registry image references and --set-secrets deployment
- [ ] **INFRA-06**: OAuth redirect URIs updated from Replit domain to Cloud Run URL

### Security

- [ ] **SEC-01**: API key endpoints (/api/secrets/*) removed or moved to server-side proxy pattern so keys are never exposed to browser
- [ ] **SEC-02**: Admin endpoints (/api/auth/toggle, /api/auth/users) require authentication
- [ ] **SEC-03**: Open SQL query endpoint (/api/gcloud/sql/query) removed or restricted to authenticated admin only
- [ ] **SEC-04**: CORS restricted from wildcard (*) to specific allowed origins
- [ ] **SEC-05**: Prominent medical disclaimer ("not medical advice") displayed on all drug analysis pages

### Visual Polish

- [ ] **UI-01**: Safety score displayed as color-coded badge (green for safe, yellow for caution, orange for moderate risk, red for high risk) based on weighted score thresholds

### Shareability

- [ ] **SHARE-01**: Drug analysis accessible via shareable URL path (/drug/:drugSlug) that auto-triggers analysis without requiring user to re-type drug name

### Engagement

- [ ] **ENGAGE-01**: Data confidence score displayed in the UI showing how reliable the analysis data is (type already exists in codebase as ConfidenceScore)
- [ ] **ENGAGE-02**: Safety trend indicator displayed showing whether drug's safety profile is improving or worsening over time (type already exists as SafetyTrendIndicator)
- [ ] **ENGAGE-03**: Recently searched drugs shown for quick re-access to previous analyses

## v2 Requirements

### Visual Polish

- **UI-02**: Plain-language safety verdict text ("Generally Safe" / "Use Caution" / "Higher Risk") alongside score
- **UI-03**: Animated score card entrance with staggered reveal using motion library
- **UI-04**: Scroll-triggered report section reveals with motion library
- **UI-05**: Mobile-first responsive design polish for phone-sized screens

### Shareability & SEO

- **SHARE-02**: Open Graph meta tags injected server-side by Flask for social media preview cards (title, description, URL)
- **SHARE-03**: Schema.org Drug structured data markup for Google search discoverability

### Engagement

- **ENGAGE-04**: "Talk to Your Doctor" discussion points generated from analysis data
- **ENGAGE-05**: Saved/bookmarked drug reports for authenticated users

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom domain | Cloud Run default URL is fine for now |
| Mobile native app | Web-first, mobile later |
| Medication reminders | Medisafe's domain, not PharmKo's focus |
| Drug pricing/coupons | GoodRx's domain, not PharmKo's focus |
| User reviews/ratings | Creates liability, not PharmKo's value prop |
| AI chatbot | Adds complexity and liability without matching core value |
| Real-time chat/community | This is a lookup tool, not a social platform |
| Gamification/badges | Clean and informative, not gamified |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| INFRA-05 | — | Pending |
| INFRA-06 | — | Pending |
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| SEC-05 | — | Pending |
| UI-01 | — | Pending |
| SHARE-01 | — | Pending |
| ENGAGE-01 | — | Pending |
| ENGAGE-02 | — | Pending |
| ENGAGE-03 | — | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
