# PharmKo - Secrets Management Migration

## What Changed?

Your app has been migrated from storing API keys in the frontend to using **Google Cloud Secrets Manager** for secure credential management.

### Before ❌
- API keys hardcoded in `config.ts`
- API keys baked into Docker images
- Secrets exposed in source code
- Manual key rotation required updates to code

### After ✅
- API keys stored in Google Cloud Secrets Manager
- Backend retrieves secrets at runtime
- Frontend never sees raw credentials
- Easy key rotation without code changes
- Centralized secret management
- Full audit trail of access

## Architecture

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ HTTP Request
       │ /api/secrets/gemini-key
       ▼
┌─────────────────┐
│   Backend       │
│   (Flask)       │
│                 │
│ ┌─────────────┐ │
│ │ Secret      │ │
│ │ Manager     │ │
│ │ Client      │ │
│ └────┬────────┘ │
└──────┼──────────┘
       │ gRPC/REST
       ▼
┌─────────────────────────────┐
│ Google Cloud Secrets Manager│
│ - gemini-api-key            │
│ - fda-api-key               │
└─────────────────────────────┘
```

## Files Changed/Added

### Modified Files
- `Dockerfile` - Now runs Flask backend + serves static React app
- `cloudbuild.yaml` - Creates secrets in Secret Manager instead of build args
- `config.ts` - Removes hardcoded API keys
- `services/geminiService.ts` - Fetches keys from backend
- `services/secretManager.ts` - New service for fetching secrets
- `backend/requirements.txt` - Adds google-cloud-secret-manager

### New Files
- `backend/main.py` - Flask app with Secret Manager integration
- `backend.Dockerfile` - Backend-only Docker image
- `frontend.Dockerfile` - Frontend-only Docker image for local dev
- `setup-gcp-secrets.sh` - Helper script for initial setup
- `SECRETS_SETUP.md` - Detailed setup guide
- `.env.local.example` - Example environment variables

## Quick Start

### 1. Set up Google Cloud Secrets (One Time)

```bash
# Make the setup script executable
chmod +x setup-gcp-secrets.sh

# Run the interactive setup
./setup-gcp-secrets.sh

# Or manually:
gcloud secrets create gemini-api-key --data-file=- <<< "YOUR_KEY"
gcloud secrets create fda-api-key --data-file=- <<< "YOUR_KEY"
```

### 2. Local Development

```bash
# Terminal 1: Start backend (reads from local env vars)
cd backend
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key"
export FDA_API_KEY="your_key"
python main.py

# Terminal 2: Start frontend
npm run dev
```

Or use Docker Compose:
```bash
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key"
export FDA_API_KEY="your_key"
docker-compose up
```

### 3. Deploy to Cloud Run

```bash
# Set up Cloud Build Trigger with substitution variables:
# _GEMINI_API_KEY=your_key
# _FDA_API_KEY=your_key

# Push to trigger build
git add .
git commit -m "Configure Secrets Manager"
git push origin main
```

## Environment Variables

### Backend
- `GCP_PROJECT_ID` - Your Google Cloud project ID
- `GEMINI_API_KEY` - (Local dev only) Gemini API key
- `FDA_API_KEY` - (Local dev only) FDA API key
- `PORT` - Port to run Flask on (default: 5000)

### Frontend
- `VITE_BACKEND_URL` - URL of backend (default: http://localhost:5000)

## API Endpoints

The backend now exposes these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/config` | GET | Check if secrets are configured |
| `/api/secrets/gemini-key` | GET | Get Gemini API key |
| `/api/secrets/fda-key` | GET | Get FDA API key |

## Security Notes

### What's Secure Now ✅
- Secrets never in source code
- Secrets never in Docker images
- Secrets never committed to git
- Centralized access control
- Audit logs for all access
- Easy rotation without code changes

### Best Practices
1. **Rotate keys regularly** - Use `gcloud secrets versions add` to update
2. **Use separate keys for environments** - dev, staging, prod should have different keys
3. **Monitor access** - Check Cloud Logging for unusual access patterns
4. **Least privilege** - Only grant Secret Manager access to necessary service accounts
5. **Audit trail** - Review who accessed secrets and when

## Troubleshooting

### Backend can't access secrets locally
Ensure you have:
- `gcloud` CLI installed and authenticated
- `GCP_PROJECT_ID` environment variable set
- Secrets created in Secret Manager: `gcloud secrets list`

### Frontend can't connect to backend
- Check backend is running: `curl http://localhost:5000/api/health`
- Verify `VITE_BACKEND_URL` is set correctly
- Check browser console for CORS errors

### Cloud Run deployment fails
- Check build logs: `gcloud builds log HASH`
- Verify service account has Secret Manager access
- Check Cloud Run logs: `gcloud run logs read pharmko-app`

## Reverting (Not Recommended)

If you need to revert, you would need to:
1. Move API keys back to environment variables or config
2. Update Dockerfile to pass keys as build args
3. Update frontend to use hardcoded keys (not secure!)

**We recommend staying with Secrets Manager** - it's more secure!

## Support

For more information:
- [Google Cloud Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Cloud Run with Secret Manager](https://cloud.google.com/run/docs/configuring/secrets)
- See `SECRETS_SETUP.md` for detailed setup instructions
