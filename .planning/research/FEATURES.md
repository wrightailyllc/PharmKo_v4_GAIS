# Feature Landscape

**Domain:** Consumer drug safety analysis app
**Researched:** 2026-03-12
**Overall Confidence:** MEDIUM-HIGH (based on competitor analysis, published research, and existing codebase review)

## Context: What PharmKo Already Has

Before mapping the feature landscape, here is what exists in the codebase today:

- Drug search with single text input (DrugInputForm)
- 6-dimension safety scoring engine (adverse events volume, severity, clinical trial support, journal signals, label warnings, interactions)
- Overall Potential Harm Score (0-100 numeric)
- Pie chart visualization of adverse event distribution (custom SVG PieChart component)
- Score breakdown with per-dimension contribution details
- Gemini AI-generated narrative report with sections for drug label analysis, clinical trials, adverse effects, journal findings, interactions
- Source data transparency viewer (raw API URLs + JSON data from RxNorm, FDA, ClinicalTrials.gov, Europe PMC)
- PDF export (jspdf + html2canvas)
- Auth (Google OAuth, Facebook OAuth, email/password)
- React Router with `/drug/:drugSlug` route already stubbed
- Confidence Score and Safety Trend Indicator types defined but not yet surfaced in UI
- Engagement metrics types defined (totalSearches, uniqueDrugsSearched, reportsDownloaded, savedReports)

**This research focuses on what to ADD for consumer polish and shareability, not what to rebuild.**

---

## Table Stakes

Features users expect from a consumer drug safety/information tool. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Color-coded safety score badge** | Every competitor (Drugs.com, Medscape, WebMD) uses color-coded severity. A raw number means nothing to consumers. Green/yellow/orange/red is universal shorthand for risk. | Low | PharmKo has the score (0-100). Needs a visual badge with color mapping: green (0-25 low risk), yellow (26-50 moderate), orange (51-75 elevated), red (76-100 high). This is the single most important visual change. |
| **Plain-language safety verdict** | Consumers want "Is this safe?" answered in one sentence, not a report to parse. Drugs.com and WebMD lead with plain-language summaries. GoodRx uses simple categories. | Low | Add a one-line verdict above the score: e.g., "Generally well-tolerated with routine monitoring" or "Elevated risk -- discuss alternatives with your doctor." Already have Gemini generating summaries; distill to one sentence. |
| **Medical disclaimer** | FTC requires no deceptive claims. FDA guidance says health info apps need clear disclaimers. Every competitor has "This is not medical advice" prominently displayed. Absence creates legal liability and erodes trust. | Low | Persistent footer disclaimer + contextual disclaimer on every report. Required text: "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment." |
| **Mobile-responsive layout** | 60%+ of health searches happen on mobile (MEDIUM confidence, multiple sources). Current dark UI with gray-800 cards works but needs touch-target sizing (48px minimum per WCAG 2.1 AA) and responsive breakpoints. | Medium | Existing Tailwind setup supports this. Focus: drug input form ergonomics on mobile, score card readability, report section collapsibility on small screens. |
| **Interaction severity indicators** | PharmKo already has interactions with severity field. But competitors (Drugs.com, Medscape) use 3-4 level severity with color coding: Contraindicated (red), Serious (orange), Monitor (yellow), Minor (gray). Raw text severity is not scannable. | Low | Map existing severity strings to color-coded badges. Follow Drugs.com pattern: Major (red), Moderate (orange), Minor (yellow). |
| **Score breakdown visualization** | PharmKo has `ScoreBreakdown` with 6 weighted dimensions already in types. But the PieChart currently only shows adverse event distribution. Users need to see WHAT drives the safety score, not just the number. | Medium | Radar/spider chart or horizontal bar chart showing contribution of each dimension. This is what makes the score trustworthy -- transparency into the methodology. |
| **Loading state with progress** | AnalysisProgress component exists and shows step-by-step analysis. This is already table stakes quality. Keep it. | Already done | Existing component is good. Minor polish: add estimated time remaining, smoother transitions. |
| **Source attribution/citations** | PharmKo already has a citations array and SourceDataViewer. Competitors like Drugs.com cite FDA labels and databases. This builds trust. | Already done | Already present. Consider making citations more prominent (not hidden in a "Source Data" section). |

## Differentiators

Features that set PharmKo apart from competitors. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Animated score reveal with motion library** | Score cards animate in sequentially with a satisfying number counter effect -- makes the result feel "computed" and trustworthy. Use `motion` (v12.36.0) for staggered entrance animations, number counting animation via animate(). The "wow factor" that makes users share. | Low | `motion` handles layout animations, staggered children, exit animations. Tailwind handles all styling. Key pattern: use motion's `initial`, `animate`, `transition` props, never mix with Tailwind `transition-*` classes. |
| **Shareable drug report URLs** | No competitor offers a shareable safety score card with a clean URL. Drugs.com has drug pages but no personalized score cards. PharmKo's `/drug/metformin` route is already stubbed. When someone texts "check this out" with a PharmKo link, THAT is organic growth. | Medium | Three parts: (1) Flask server-side meta tag injection for social previews, (2) Open Graph meta tags for social preview cards, (3) allow viewing without auth (score card is public, full report requires login). This is the highest-ROI differentiator. |
| **Open Graph social preview cards** | When a PharmKo link is shared on iMessage, WhatsApp, Twitter, or Facebook, the preview should show the drug name, safety score badge, and a one-line verdict. This makes shares compelling enough to click. No drug safety app does this well. | Medium | Requires server-side meta tag injection (Flask can serve dynamic `<meta>` tags for drug pages). react-helmet-async handles in-browser meta but social crawlers don't execute JS. The Flask `serve_react_app()` function must inject OG tags for `/drug/*` paths. |
| **Scroll-triggered section reveals** | As user scrolls through the report, sections fade/slide in -- feels modern and polished. | Low | motion `whileInView` prop makes this trivial. Wrap report sections in `<motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }}>`. |
| **Confidence score display** | PharmKo already has `ConfidenceScore` type (dataCompleteness, dataRecency, sourceAgreement). No consumer competitor shows how confident they are in their data. This is radical transparency. Showing "We're 85% confident in this analysis (based on 4/4 data sources)" builds MORE trust than hiding uncertainty. | Low | Type already defined. Surface it as a small badge near the safety score: "Data confidence: High (4/4 sources responding, data from last 90 days)." |
| **Safety trend indicator** | PharmKo has `SafetyTrendIndicator` type (improving/stable/worsening/unknown). No consumer drug app shows trend over time. An arrow showing "Safety profile worsening -- 23% more adverse events in last quarter" is genuinely useful information that you cannot get from Drugs.com. | Medium | Requires historical FAERS data comparison. Type exists. Backend needs to calculate trend from FAERS quarterly data. Display as simple arrow + sentence next to score. |
| **AI-generated "Talk to Your Doctor" points** | Gemini already generates the full report. Extract 3-5 bullet points: "Questions to ask your doctor about [drug]." This bridges the gap between information and action. No competitor does this. | Low | Prompt engineering addition to existing Gemini call. Add a section: "Bring these questions to your next appointment." Positions PharmKo as a doctor-visit companion, not a replacement. |
| **Drug comparison (side-by-side)** | Drugs.com and GoodRx have comparison tools, but they compare price/side effects. PharmKo could compare safety SCORES side by side: "Metformin (Score: 32) vs Januvia (Score: 47)." A doctor says "We could try either of these" -- the patient compares on PharmKo. | High | Requires running two analyses and displaying results side-by-side. Defer to later phase. High complexity because of UI layout and double API cost. |
| **Recently searched drugs (personal history)** | Engagement metrics types exist. If a user searches 3 drugs, they should see their history without re-searching. Quick access to previous analyses. | Low | Store in localStorage or backend (if auth'd). Simple list component. Low effort, high usability payoff. |
| **Saved/bookmarked reports** | The BookmarkIcon already exists in the icon set. Let users save reports for drugs they take regularly. "My medications" dashboard. | Medium | Requires backend persistence (Cloud SQL is available). UI for saved list + save/unsave toggle on reports. Natural extension of auth system. |

## Anti-Features

Features to explicitly NOT build. Each has a reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Medication reminders/pill tracker** | Medisafe, Pillo, and dozens of apps own this space. It requires recurring notification infrastructure, complex scheduling logic, and ongoing engagement loops. PharmKo is a lookup tool, not a daily companion. Building this dilutes focus and competes against $1B+ companies. | Link out to Medisafe or similar. "Set a reminder for this medication" -> deep link to Medisafe. |
| **Drug pricing/coupon comparison** | GoodRx's entire business model. They have pharmacy partnerships, pricing APIs, and coupon infrastructure. PharmKo cannot compete and adding prices next to safety scores conflates cost with safety (dangerous framing). | Omit entirely. If asked, say "For pricing, try GoodRx." PharmKo is about safety, not savings. |
| **User-generated reviews/ratings** | WebMD and Drugs.com have user review systems. These are problematic: anecdotal, biased toward negative experiences, create liability, and require moderation infrastructure. PharmKo's value is DATA-driven analysis, not crowd sentiment. | Rely on FDA FAERS data (which IS crowd reporting, but systematic and verified). The AI report already synthesizes real-world evidence. |
| **Community forums/chat** | Already listed as out of scope in PROJECT.md. Drug information forums require content moderation, liability management, and create legal risk when users give each other medical advice. | Keep PharmKo as a lookup tool. No user-to-user interaction. |
| **Gamification (badges, streaks)** | Already listed as out of scope in PROJECT.md. Gamifying drug safety information trivializes serious health decisions. A "streak" for checking drug safety is the wrong framing. | Clean, informative, professional. The "reward" is peace of mind, not points. |
| **Prescription management** | Managing active prescriptions, dosage tracking, and refill ordering requires HIPAA compliance, pharmacy integrations, and insurance APIs. Massive scope expansion for a different product category. | PharmKo analyzes one drug at a time. If users want to check interactions between their medications, offer multi-drug interaction checking (a lighter feature than full prescription management). |
| **AI chatbot/conversational interface** | Tempting because Gemini supports it. But conversational AI for drug safety creates liability ("the AI told me to stop taking my medication"). Structured reports with citations are safer legally and more trustworthy than chat responses. | Keep the structured report format. The AI generates the report, but the user interacts with structured sections, not a free-form chat. |
| **Native mobile app** | Already listed as out of scope in PROJECT.md. PWA or responsive web covers the use case. Native apps require App Store review (especially strict for health apps), separate codebases, and ongoing maintenance. | Invest in responsive web. Consider PWA (add to home screen) as a future lightweight step. |

## Feature Dependencies

```
Color-coded safety badge --> Plain-language verdict (verdict contextualizes the color)
                         --> Score breakdown visualization (explains WHY this color)

Shareable URLs --> Open Graph social cards (shares need previews)
              --> Medical disclaimer (shared pages MUST have disclaimers)
              --> Public score card view (must work without auth)

Cloud Run deployment --> Shareable URLs work (need stable public URL)
Flask meta injection --> Social media preview cards (crawlers need server-rendered OG tags)
motion library install --> Animated score reveal, scroll effects, page transitions

Dedicated service account --> Secret Manager access, Cloud SQL, GCS
Artifact Registry repo --> Cloud Build pipeline works on new GCP project

Confidence score display --> Score breakdown visualization (both require ScoreBreakdown data)
                         --> Safety trend indicator (confidence includes data recency)

Saved/bookmarked reports --> Auth system (already exists)
                         --> Recently searched drugs (similar data storage pattern)

Drug comparison --> Shareable URLs (need to compare at individual drug level first)
               --> Score breakdown visualization (comparison is meaningless without dimension breakdown)
```

## MVP Recommendation (Consumer Polish Milestone)

**Must ship together (Phase 1 -- GCP Foundation + Deployment):**
1. Cloud Run deployment with dedicated service account -- nothing else works without this
2. Artifact Registry migration -- cloudbuild.yaml uses deprecated gcr.io format
3. Secret Manager integration via --set-secrets -- proper secrets management
4. Medical disclaimer -- legal requirement, cannot ship without it

**Ship next (Phase 2 -- Core Visual Polish):**
1. Color-coded safety score badge -- transforms the core experience from "number" to "verdict"
2. Plain-language safety verdict -- the one-sentence answer to "is this safe?"
3. Animated score reveal with motion library -- consumer-grade feel
4. Interaction severity indicators -- color-coded badges on existing interaction data
5. Score breakdown visualization -- makes the score trustworthy and transparent
6. Mobile-responsive polish -- majority of health lookups are mobile

**Ship after (Phase 3 -- Shareability + SEO):**
1. Shareable drug report URLs with auto-analysis from URL params
2. Flask server-side meta tag injection for OG tags
3. Open Graph social preview cards
4. Public score card view (no auth required to see score card)

**Ship after (Phase 4 -- Engagement):**
1. Confidence score display -- builds advanced trust
2. Safety trend indicator -- unique differentiator
3. Recently searched drugs -- usability improvement
4. "Talk to Your Doctor" points -- actionable output
5. Saved/bookmarked reports -- retention feature

**Defer indefinitely:**
- Drug comparison: High complexity, high API cost, valuable but not urgent
- Native mobile app: Responsive web covers the use case

## Sources

### Competitor Analysis (MEDIUM confidence -- direct observation)
- [GoodRx App Store listing](https://apps.apple.com/us/app/goodrx-prescription-savings/id485357017) -- medication tracker, refill reminders, savings focus
- [Drugs.com Drug Interaction Checker](https://www.drugs.com/drug_interactions.html) -- color-coded severity (major/moderate/minor), plain language, aggregates FDA + Cerner Multum
- [Drugs.com Drug Comparison Tool](https://www.drugs.com/compare/) -- side-by-side ratings, prices, side effects for up to 4 drugs
- [GoodRx Drug Comparison Tool](https://www.goodrx.com/compare) -- user ratings, costs, side effects, generics
- [WebMD Drug Interaction Checker](https://www.webmd.com/interaction-checker/default.htm) -- pharmacist-reviewed, patient-friendly language, food interactions
- [Medscape Drug Interaction Checker](https://reference.medscape.com/drug-interactionchecker) -- up to 30 items, 4-level severity, CYP mechanism explanations
- [Medisafe App](https://medisafeapp.com/features/) -- family sharing, interaction warnings, dose reminders, health tracking

### Drug Interaction Checker Research (MEDIUM confidence -- published research + multiple sources)
- [IntuitionLabs Drug Interaction Checkers Comparison 2025](https://intuitionlabs.ai/articles/drug-interaction-checkers-comparison-lexicomp-medscape) -- detailed feature comparison of Lexicomp, Medscape, Epocrates, Drugs.com, Micromedex; only 16-24% concordance across checkers
- [OpenMD 5 Best Drug Interaction Checkers](https://openmd.com/directory/drug-interactions)
- [PMC: Consumer Mobile Apps for DDI Check -- MARS Systematic Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5895923/) -- top-rated: Lexicomp, Epocrates, Micromedex, Drugs.com

### UX and Design (MEDIUM confidence -- published guides + research)
- [Eleken Healthcare UI Design 2026 Best Practices](https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications) -- predictive dashboards, calm visual language, whitespace, transparency about data usage
- [JMIR: Design Principles for Drug Safety Dashboards](https://medinform.jmir.org/2026/1/e75936) -- functionality, display mode, added value categorization
- [JMIR: VisDrugs -- FDA ADR Visualization](https://formative.jmir.org/2025/1/e71519) -- interactive adverse drug reaction visualization
- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/) -- bottom tab bars, 48px touch targets, thumb-zone placement

### Trust and Compliance (MEDIUM confidence -- official sources)
- [FDA: Device Software Functions Including Mobile Medical Applications](https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications) -- PharmKo likely falls under "general wellness" exemption (educational, not diagnostic)
- [FTC: Mobile Health App Interactive Tool](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool) -- cannot make deceptive claims, must disclose material information
- [FDA Digital Health Guidance 2026](https://intuitionlabs.ai/articles/fda-digital-health-technology-guidance-requirements) -- low-risk digital health tools have loosened regulatory requirements
- [HHS WCAG 2.1 AA Accessibility Requirements](https://accessible.org/hhs-web-accessibility-wcag-21-aa/) -- May 2026 deadline for 15+ employee organizations, 4.5:1 contrast ratio, 7:1 recommended for critical health content

### SEO and Schema (MEDIUM confidence -- official + industry sources)
- [Schema.org Drug Type](https://schema.org/Drug) -- structured data for drug information pages
- [Schema Markup for Pharmaceutical SEO](https://www.emaginehealth.com/blog/medical-schema-pharmaceutical-drug-products-seo/) -- Drug, MedicalCondition, MedicalTherapy schemas
- [Pharmaceutical SEO and FDA Compliance 2025](https://www.9digitalmedia.com/pharmaceutical-seo-and-regulatory-compliance-with-fda-rules-2025/) -- structured data must accurately represent approved content

### Market Data (LOW-MEDIUM confidence -- industry reports)
- [GlobeNewsWire: Medication Side-Effect Tracker App Market](https://www.globenewswire.com/news-release/2025/12/17/3206774/0/en/Global-Medication-Side-Effect-Tracker-App-Market-to-Reach-2-45-Billion-by-2029.html) -- market grew from $1.26B (2024) to $1.44B (2025), CAGR 14.5%, projected $2.45B by 2029
