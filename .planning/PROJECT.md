# PharmKo

## What This Is

PharmKo is a consumer-facing drug safety analysis app. Users type a drug name and instantly get a visual safety score card backed by real FDA adverse event data (FAERS) and Gemini AI analysis. It's designed for people who've been prescribed something and want a quick, clear answer: "is this safe?" — not a medical database, but a friendly, shareable safety check.

## Core Value

A worried patient can search any drug and immediately understand its safety profile through a clear, visual score card — no medical jargon, no research skills required.

## Requirements

### Validated

- ✓ Drug safety scoring engine (weighted: adverse events, severity, clinical trials, journal signals, label warnings, interactions) — existing
- ✓ FDA FAERS adverse event data integration — existing
- ✓ Gemini AI-powered analysis and report generation — existing
- ✓ React/TypeScript frontend with Tailwind CSS — existing
- ✓ Flask backend with API secret management — existing
- ✓ User authentication (email/password, Google OAuth, Facebook OAuth) — existing
- ✓ Google Cloud services integration (Storage, Cloud SQL) — existing
- ✓ Cloud Build deployment pipeline (cloudbuild.yaml) — existing
- ✓ Report display with source data viewer — existing
- ✓ PDF export capability (jspdf + html2canvas) — existing

### Active

- [ ] Fresh GCP project setup with dedicated service account for Cloud Run
- [ ] Cloud Run deployment (migrate from Replit hosting)
- [ ] Consumer-grade UI polish (animations, modern design, satisfying interactions)
- [ ] Shareable drug report URLs (e.g., /drug/metformin)
- [ ] Quick score card experience — fast verdict on landing, not deep research tool
- [ ] SEO-friendly drug pages for discoverability
- [ ] Mobile-responsive design polish

### Out of Scope

- Custom domain — Cloud Run default URL is fine for now
- Mobile native app — web-first
- Real-time chat or community features — this is a lookup tool
- Deep research/exploration mode — keeping it simple and fast
- Gamification or badge systems — clean and informative, not gamified

## Context

PharmKo was originally built on Replit and is being migrated to Google Cloud Run. The core analysis engine is functional — it queries FDA FAERS data, scores drugs across 6 weighted dimensions (adverse event volume, severity, clinical trial support, journal signals, label warnings, interactions), and generates AI-powered reports via Gemini.

The app has auth (Google/Facebook OAuth + email/password), Cloud SQL integration, and a Cloud Build pipeline. The migration needs a fresh GCP project with proper service account setup.

The target user is someone who's been prescribed a medication (or is considering one) and wants a quick, trustworthy answer about its safety — not a healthcare professional doing research, but an everyday person making a personal health decision.

## Constraints

- **Tech stack**: React 18 + TypeScript + Vite + Tailwind (frontend), Flask + Python (backend) — existing, not changing
- **AI**: Google Gemini API (@google/genai) — existing integration
- **Data source**: FDA FAERS (openFDA) — existing integration
- **Hosting**: Google Cloud Run — target platform
- **Secrets**: Google Cloud Secret Manager — existing pattern
- **Auth**: Existing OAuth + session token system — keep working

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep existing tech stack | Working code, no need to rewrite | — Pending |
| Cloud Run over other platforms | User preference, existing Cloud Build config | — Pending |
| Quick score card over research tool | Target audience wants fast answers, not deep dives | — Pending |
| URL sharing over image/PDF sharing | Simplest path to shareability | — Pending |
| Default Cloud Run URL | Custom domain deferred, reduces setup complexity | — Pending |

---
*Last updated: 2026-03-12 after initialization*
