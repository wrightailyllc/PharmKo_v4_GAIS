# PharmKo AI Agent Instructions

This document provides essential guidance for AI agents working with the PharmKo codebase.

## Project Overview

PharmKo is a pharmacovigilance application that analyzes drug safety data using Gemini AI. It aggregates data from multiple authoritative sources (FDA, PubMed, ClinicalTrials.gov) to provide comprehensive safety analysis reports.

### Architecture

- **Frontend**: React + TypeScript + Vite
- **Core Service**: `geminiService.ts` - Handles API integrations and AI analysis
- **Data Flow**: 
  1. User enters drug name
  2. Drug data fetched from multiple APIs (RxNorm → FDA → Clinical Trials → PubMed)
  3. Raw data synthesized by Gemini AI into structured report
  4. Results displayed in interactive UI components

## Key Conventions

### Component Structure
- **Pages**: High-level route components (`LandingPage.tsx`, `DashboardPage.tsx`)
- **Components**: Reusable UI elements with Tailwind CSS styling
- **Services**: API and data processing logic (`geminiService.ts`)
- **Types**: Shared TypeScript interfaces in `types.ts`

### Data Flow Patterns
- **Drug Analysis Pipeline**:
  ```typescript
  // Example from geminiService.ts
  const { rxcui, activeIngredient } = await fetchRxNormData(drugName);
  const [
    { fdaLabel, adverseEvents },
    clinicalTrials,
    pubmedData,
  ] = await Promise.all([...]);
  ```

### State Management
- Uses React's built-in state management with hooks
- Progress tracking via `analysisLog` array
- View switching between report/source data views

## Common Tasks

### Adding New Data Sources
1. Add API interface in `geminiService.ts`
2. Update `SourceData` type in `types.ts`
3. Integrate data into AI prompt
4. Update UI components to display new data

### Modifying Report Sections
1. Update `AnalysisResult` interface in `types.ts`
2. Adjust AI prompt schema in `geminiService.ts`
3. Add/modify section in `ReportDisplay.tsx`

### Development Workflow
1. Install dependencies: `npm install`
2. Set required env vars: `GEMINI_API_KEY`
3. Start dev server: `npm run dev`

## API Dependencies

- **RxNorm**: Drug identification
- **FDA**: Drug labels and adverse events
- **ClinicalTrials.gov**: Trial data
- **PubMed/Europe PMC**: Research articles
- **Google AI (Gemini)**: Data synthesis

## Important Files

- `services/geminiService.ts`: Core analysis logic and API integrations
- `types.ts`: Shared TypeScript interfaces
- `components/ReportDisplay.tsx`: Main report UI
- `components/SourceDataViewer.tsx`: Raw data display

## UI/UX Patterns

- Use `ReportSection` component for consistent section styling
- Include appropriate icons from `components/icons/`
- Follow existing error handling patterns (see `DashboardPage.tsx`)
- Maintain responsive design with Tailwind classes

## Future Development Areas

1. Premium features (marked with `LockClosedIcon`)
2. User authentication integration
3. Personalized risk assessments
4. Report saving functionality

Remember to maintain error handling and loading states for API operations. The system is designed to gracefully handle API failures while keeping users informed of progress.