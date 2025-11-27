# PharmKo - Pharmaceutical Safety Analysis App

## Overview
PharmKo is a comprehensive pharmaceutical safety analysis application that uses AI to analyze drug safety data from multiple authoritative sources including the FDA, PubMed, ClinicalTrials.gov, and Europe PMC.

## Project Structure

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI**: Tailwind CSS (via CDN)
- **Key Features**:
  - Drug safety analysis with AI-powered insights
  - Interactive charts and visualizations
  - PDF report generation
  - Source data viewer

### Backend (Flask/Python)
- **Framework**: Flask 3.0
- **Purpose**: Secure API key management and static file serving
- **Key Features**:
  - API key retrieval from Replit Secrets
  - Static file serving for production deployment
  - CORS support for development

## Architecture

### Development Mode
- **Frontend**: Vite dev server on `0.0.0.0:5000`
- **Backend**: Flask on `localhost:8000`
- Frontend fetches API keys from backend, then calls external APIs directly

### Production Mode
- **Backend only**: Flask on `0.0.0.0:5000`
- Serves built React app as static files
- Provides API key endpoints for frontend
- Automatically detected via `REPL_DEPLOYMENT` environment variable

## Required Secrets

This application requires two API keys to be configured in Replit Secrets:

1. **GEMINI_API_KEY**: Google Gemini API key for AI analysis
   - Get it from: https://aistudio.google.com/apikey
   
2. **FDA_API_KEY**: FDA API key (optional but recommended for higher rate limits)
   - Get it from: https://open.fda.gov/apis/authentication/

To add these secrets:
1. Click on "Secrets" in the left sidebar
2. Add each secret with the exact name shown above
3. Restart the application

## Running the Application

### Development
The application starts automatically via the configured workflow:
- Frontend: http://localhost:5000
- Backend: http://localhost:8000

### Manual Start
```bash
bash start.sh
```

## Deployment

The application is configured for Replit deployment with:
- **Build**: `npm run build`
- **Run**: `cd backend && python main.py`
- **Target**: VM (stateful deployment)

When deployed, the backend automatically:
- Binds to 0.0.0.0:5000
- Serves the built React app
- Provides API key endpoints

## Recent Changes

### Adapted for Replit (November 27, 2025)
- Removed Google Cloud Secret Manager dependency
- Updated backend to use Replit Secrets
- Configured Vite for Replit proxy compatibility
- Set up dual-mode operation (dev/production)
- Created unified startup script
- Configured deployment settings

## User Preferences
None documented yet.

## Key Files
- `start.sh`: Startup script for development mode
- `backend/main.py`: Flask backend with secret management
- `vite.config.ts`: Vite configuration with Replit settings
- `services/secretManager.ts`: Frontend service for fetching API keys
- `services/geminiService.ts`: AI analysis service

## External APIs Used
- Google Gemini API (AI analysis)
- openFDA API (drug labels, adverse events)
- RxNorm API (drug identification)
- ClinicalTrials.gov API (clinical trial data)
- Europe PMC API (research articles)
