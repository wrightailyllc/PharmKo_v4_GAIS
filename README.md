<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PharmKo - Pharmaceutical Safety Analysis App

This is a comprehensive application for analyzing pharmaceutical safety data using AI and government databases.

View your app in AI Studio: https://ai.studio/apps/drive/1SSQiu9OYhf7Cg7yFDIe7QWL16N0tKFvR

## 🔐 Security Update

This app now uses **Google Cloud Secrets Manager** for secure API credential management. API keys are no longer stored in the frontend or committed to version control.

See [MIGRATION.md](MIGRATION.md) for details on the architecture change and [SECRETS_SETUP.md](SECRETS_SETUP.md) for setup instructions.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Google Cloud project (for production)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend:**
   ```bash
   cd backend
   export GEMINI_API_KEY="your_key_here"
   export FDA_API_KEY="your_key_here"
   python main.py
   ```

3. **In another terminal, start the frontend:**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

### Using Docker Compose

```bash
export GEMINI_API_KEY="your_key_here"
export FDA_API_KEY="your_key_here"
docker-compose up
```

### Production Deployment

1. Set up Google Cloud Secrets:
   ```bash
   ./setup-gcp-secrets.sh
   ```

2. Configure Cloud Build trigger with substitution variables:
   - `_GEMINI_API_KEY`: Your API key
   - `_FDA_API_KEY`: Your API key

3. Push to deploy:
   ```bash
   git push origin main
   ```

See [SECRETS_SETUP.md](SECRETS_SETUP.md) for detailed production setup.

## Project Structure

```
.
├── components/          # React components
│   ├── AnalysisProgress.tsx
│   ├── DrugInputForm.tsx
│   ├── ReportDisplay.tsx
│   └── icons/          # Icon components
├── pages/              # Page components
│   ├── DashboardPage.tsx
│   └── LandingPage.tsx
├── services/           # Business logic
│   ├── geminiService.ts    # AI analysis
│   └── secretManager.ts    # Secret retrieval
├── backend/            # Flask backend
│   ├── main.py         # Secret Manager integration
│   └── requirements.txt
├── Dockerfile          # Production Docker image
├── docker-compose.yml  # Local development
└── vite.config.ts      # Vite configuration
```

## Key Features

- 🤖 **AI-Powered Analysis** - Uses Google Gemini API for pharmaceutical safety analysis
- 💊 **Multi-Source Data** - Aggregates data from:
  - FDA drug labels and adverse events
  - RxNorm drug identifier
  - Clinical Trials.gov
  - Europe PMC research articles
- 📊 **Visual Reports** - Generates comprehensive safety reports with charts
- 🔐 **Secure Credentials** - Secrets managed via Google Cloud Secret Manager
- ☁️ **Cloud Native** - Runs on Google Cloud Run

## API Services Used

- **Google Gemini API** - For AI analysis
- **openFDA API** - For FDA drug data
- **RxNorm API** - For drug identification
- **ClinicalTrials.gov API** - For clinical trial data
- **Europe PMC API** - For research articles

## Configuration

See `.env.local.example` for available environment variables.

For production, use Google Cloud Secret Manager (see [SECRETS_SETUP.md](SECRETS_SETUP.md)).

## Development

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
export GCP_PROJECT_ID="your-project"
python main.py
```

## Deployment

This app is configured for deployment to Google Cloud Run with automatic builds via Cloud Build.

See [SECRETS_SETUP.md](SECRETS_SETUP.md) for complete deployment instructions.

## License

[Add your license here]

## Support

For issues or questions, please open an issue on GitHub.
