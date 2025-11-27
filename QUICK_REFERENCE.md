# Quick Reference Card

## 🚀 Local Development (5 minutes)

```bash
# 1. Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key"
export FDA_API_KEY="your_key"

# 2. Start backend (Terminal 1)
cd backend && python main.py
# Backend runs on http://localhost:5000

# 3. Start frontend (Terminal 2)
npm run dev
# Frontend runs on http://localhost:5173
```

## 🐳 Docker Compose (3 minutes)

```bash
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key"
export FDA_API_KEY="your_key"

docker-compose up
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

## ☁️ Cloud Production Setup (10 minutes)

```bash
# 1. Create secrets
./setup-gcp-secrets.sh

# 2. Test configuration
npm run test-secrets

# 3. Verify Cloud Build trigger has substitution variables:
#    _GEMINI_API_KEY=your_key
#    _FDA_API_KEY=your_key

# 4. Deploy
git push origin main

# 5. Monitor
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

## 📋 Common Commands

### Secrets Management
```bash
# List all secrets
gcloud secrets list

# Update a secret
echo -n "new-key" | gcloud secrets versions add gemini-api-key --data-file=-

# Delete a secret
gcloud secrets delete gemini-api-key

# View secret value (for testing)
gcloud secrets versions access latest --secret="gemini-api-key"
```

### Cloud Run
```bash
# List services
gcloud run services list --region us-central1

# View logs
gcloud run logs read pharmko-app --region us-central1 --limit 50

# Redeploy
gcloud run deploy pharmko-app \
  --image=gcr.io/$PROJECT_ID/pharmko-app:latest \
  --region=us-central1

# Get service URL
gcloud run services describe pharmko-app \
  --region us-central1 \
  --format='value(status.url)'
```

### Cloud Build
```bash
# View build history
gcloud builds list --limit 10

# View build logs
gcloud builds log BUILD_ID

# Manually trigger build
gcloud builds submit --config=cloudbuild.yaml
```

### Service Accounts
```bash
# List service accounts
gcloud iam service-accounts list

# Grant secret access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member=serviceAccount:SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

# View who has access to a secret
gcloud secrets get-iam-policy SECRET_NAME
```

## 🔍 Testing

### Test Backend Locally
```bash
# Health check
curl http://localhost:5000/api/health

# Get Gemini key
curl http://localhost:5000/api/secrets/gemini-key

# Check config
curl http://localhost:5000/api/config
```

### Test Cloud Run
```bash
export CLOUD_RUN_URL=$(gcloud run services describe pharmko-app \
  --region us-central1 --format='value(status.url)')

curl $CLOUD_RUN_URL/api/health
curl $CLOUD_RUN_URL/api/config
```

### Run Verification Script
```bash
npm run test-secrets
```

## 🐛 Debugging

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# View backend output
# Check your terminal where you ran: python main.py

# Check environment variables
echo $GCP_PROJECT_ID
echo $GEMINI_API_KEY
```

### Frontend Issues
```bash
# Check if frontend is running
curl http://localhost:5173

# Check browser console for errors (F12)

# Check backend URL
curl http://localhost:5000/api/health
```

### Cloud Run Issues
```bash
# View service details
gcloud run services describe pharmko-app --region us-central1

# View logs with errors
gcloud run logs read pharmko-app --region us-central1 \
  --limit 50 --format json | jq '.[] | select(.severity=="ERROR")'

# View recent deployments
gcloud run revisions list --service=pharmko-app --region us-central1
```

## 📁 File Structure Reference

```
pharmko-app/
├── backend/
│   ├── main.py                 # Flask backend with Secret Manager
│   └── requirements.txt         # Python dependencies
├── components/                 # React components
├── pages/                      # React pages
├── services/
│   ├── geminiService.ts        # AI analysis service
│   └── secretManager.ts        # Secret retrieval service
├── Dockerfile                  # Production image (backend+frontend)
├── docker-compose.yml          # Local dev with backend+frontend
├── backend.Dockerfile          # Backend only for dev
├── frontend.Dockerfile         # Frontend only for dev
├── cloudbuild.yaml             # Cloud Build configuration
├── setup-gcp-secrets.sh        # Setup script
├── test-secrets.sh             # Verification script
├── config.ts                   # Public config (no secrets)
├── vite.config.ts              # Vite config
└── package.json                # NPM scripts & dependencies
```

## 🔐 Security Checklist

- [ ] API keys removed from source code
- [ ] Secrets stored in Google Cloud Secret Manager
- [ ] Service account has Secret Manager access
- [ ] Cloud Build trigger has substitution variables
- [ ] Docker image doesn't contain secrets
- [ ] Backend retrieves secrets at runtime
- [ ] Frontend never stores raw credentials
- [ ] Secrets not committed to git
- [ ] Access logged and monitored
- [ ] Regular key rotation planned

## 📚 Documentation

- **SECRETS_SETUP.md** - Detailed setup guide
- **MIGRATION.md** - Architecture and migration info
- **IMPLEMENTATION.md** - Complete implementation guide
- **README.md** - Project overview

## 🆘 Getting Help

1. Check logs: `gcloud run logs read pharmko-app --limit 50`
2. Run tests: `npm run test-secrets`
3. Read docs: See `SECRETS_SETUP.md`
4. Test locally: `docker-compose up`
5. Manual test: `curl http://localhost:5000/api/health`

## ⏱️ Typical Commands by Task

### Deploy Changes
```bash
git add .
git commit -m "Description"
git push origin main
# Cloud Build automatically triggers
```

### Rotate API Key
```bash
echo -n "new-key" | gcloud secrets versions add gemini-api-key --data-file=-
# No redeployment needed! Backend automatically uses new version
```

### View Logs While Developing
```bash
gcloud run logs read pharmko-app --region us-central1 --stream
```

### Test Frontend Against Prod Backend
```bash
VITE_BACKEND_URL=$CLOUD_RUN_URL npm run dev
```

---

**Pro Tip:** Use tab completion in bash:
```bash
source <(gcloud completion bash)
```
