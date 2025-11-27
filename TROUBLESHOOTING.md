# Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Backend Issues

#### Backend won't start
**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

---

#### Backend starts but returns 403 errors
**Error:** `403 Forbidden: Insufficient credentials to access secret`

**Symptoms:**
- Backend runs but `/api/secrets/*` endpoints return 403
- Cloud Run logs show permission denied

**Solution:**
1. Verify service account has access:
```bash
gcloud secrets get-iam-policy gemini-api-key
```

2. Grant permissions:
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

---

#### Backend can't find secrets locally
**Error:** `Failed to retrieve secret gemini-api-key`

**Symptoms:**
- Backend works in Cloud Run but fails locally
- Environment variables not set

**Solution:**
```bash
# Set required environment variables
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key_here"
export FDA_API_KEY="your_key_here"

# If using local dev without Secret Manager
# Backend falls back to environment variables

# Then start backend
cd backend
python main.py
```

---

#### Backend times out on secret retrieval
**Error:** Requests to `/api/secrets/*` hang or timeout

**Symptoms:**
- Requests take > 30 seconds
- Intermittent timeouts
- Network errors in logs

**Solution:**
1. Check Secret Manager service is running:
```bash
gcloud services list --enabled | grep secretmanager
```

2. Verify network connectivity:
```bash
gcloud secrets list  # Should work quickly
```

3. Check for service account issues:
```bash
gcloud secrets get-iam-policy gemini-api-key
```

---

### 🟠 Frontend Issues

#### Frontend can't connect to backend
**Error:** `Failed to fetch` or `ERR_FAILED`

**Symptoms:**
- Browser console shows network errors
- `VITE_BACKEND_URL` pointing to wrong address
- CORS errors

**Solution:**
1. Verify backend is running:
```bash
curl http://localhost:5000/api/health
# Should return: {"status": "healthy"}
```

2. Check frontend backend URL:
```bash
# In browser console:
console.log(import.meta.env.VITE_BACKEND_URL)
# Should show backend URL
```

3. For development, ensure:
```bash
# Terminal 1: Backend
cd backend
python main.py  # Runs on :5000

# Terminal 2: Frontend
npm run dev  # Runs on :5173
# Frontend will look for backend on :5000
```

---

#### CORS errors in browser console
**Error:** `Access to XMLHttpRequest at 'http://...' from origin has been blocked`

**Symptoms:**
- Frontend can't reach backend
- Browser console shows CORS error
- Requests are blocked

**Solution:**
The backend already has CORS enabled. Check:

1. Backend is responding:
```bash
curl -H "Origin: http://localhost:5173" \
  http://localhost:5000/api/health -v
```

2. Backend is running latest code with CORS:
```bash
# Verify Flask-CORS is installed
pip list | grep flask-cors

# Reinstall if needed
pip install flask-cors==4.0.0
```

3. If behind proxy, check proxy CORS settings

---

#### Frontend gets "no API key" error
**Error:** App loads but shows "Failed to retrieve API key"

**Symptoms:**
- Landing page loads
- Can't start drug analysis
- Backend health check passes
- Error on `/api/secrets/*` endpoints

**Solution:**
1. Check backend logs:
```bash
# Check the terminal where backend is running
# Look for error messages
```

2. Verify secrets exist:
```bash
gcloud secrets list
# Should show gemini-api-key and fda-api-key
```

3. Test secret retrieval directly:
```bash
curl http://localhost:5000/api/secrets/gemini-key
# Should return: {"api_key": "YOUR_KEY"}
```

---

### 🔵 Docker Issues

#### Docker build fails with permission errors
**Error:** `permission denied while trying to connect to Docker daemon`

**Solution:**
```bash
# Add current user to docker group (Linux/Mac)
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo docker build .
```

---

#### Docker Compose services won't start
**Error:** Services start but exit immediately

**Symptoms:**
- `docker-compose up` shows services exiting
- No clear error message
- Logs show cryptic errors

**Solution:**
1. Check logs in detail:
```bash
docker-compose logs
# Shows more detailed error messages
```

2. Verify environment variables:
```bash
# Check .env file exists or variables are exported
echo $GCP_PROJECT_ID
echo $GEMINI_API_KEY
```

3. Test services individually:
```bash
docker-compose up backend  # Just backend
docker-compose up frontend  # Just frontend
```

---

#### Can't access services in Docker Compose
**Error:** `Cannot reach http://backend:5000` from frontend container

**Symptoms:**
- Frontend container can't reach backend
- Services are running but isolated
- Network errors

**Solution:**
Docker Compose creates a network. Services use service names as hostnames:

1. Use correct URLs inside containers:
   - Backend: `http://backend:5000`
   - Not: `http://localhost:5000`

2. The `docker-compose.yml` already handles this with `depends_on`

3. Test from frontend container:
```bash
docker-compose exec frontend \
  curl http://backend:5000/api/health
```

---

### 🟡 Cloud Build Issues

#### Build fails with "substitution variable not found"
**Error:** `build step 0 "..." requested output ... as image name, but no valid image was provided`

**Symptoms:**
- Cloud Build fails immediately
- References undefined substitution variables
- Build log mentions `_GEMINI_API_KEY` or `_FDA_API_KEY`

**Solution:**
1. Check trigger substitution variables:
   - Go to Cloud Build → Triggers
   - Edit your trigger
   - Verify `_GEMINI_API_KEY` and `_FDA_API_KEY` are set
   - They should have values (not empty)

2. Add if missing:
   - Name: `_GEMINI_API_KEY`
   - Value: Your actual Gemini API key
   - Name: `_FDA_API_KEY`
   - Value: Your actual FDA API key

3. Retry the build

---

#### Cloud Build succeeds but service doesn't deploy
**Error:** Build passes but Cloud Run shows old version

**Symptoms:**
- Build completes successfully
- Cloud Run still running old code
- No new revision created

**Solution:**
1. Check build logs for Cloud Run deployment step:
```bash
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID | grep -i "cloud run"
```

2. Check if image was pushed:
```bash
gcloud container images list --repository=gcr.io/$PROJECT_ID
```

3. Manual deployment:
```bash
gcloud run deploy pharmko-app \
  --image=gcr.io/$PROJECT_ID/pharmko-app:latest \
  --region=us-central1
```

---

#### Build takes too long or times out
**Error:** `Build timeout after 3600 seconds`

**Symptoms:**
- Build runs for hours
- Eventually fails with timeout
- Stuck on specific step

**Solution:**
1. Identify slow step from logs:
```bash
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID | grep -i "step"
```

2. Common slow steps:
   - `npm install` - Reduce node_modules size
   - `docker build` - Check Dockerfile for inefficiencies
   - `pip install` - Check requirements.txt for slow packages

3. Increase timeout in cloudbuild.yaml:
```yaml
timeout: '1800s'  # 30 minutes instead of default
```

---

### 🟢 Cloud Run Issues

#### Service crashes on startup
**Error:** `container exited with code 1` or `error code exited`

**Symptoms:**
- Deployment succeeds
- Service starts but crashes immediately
- Revision shows "Not Ready"

**Solution:**
1. Check logs immediately after deploy:
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

2. Common causes:
   - Missing environment variables: Check `GCP_PROJECT_ID`
   - Port mismatch: Backend expects 8080 on Cloud Run
   - Module not found: Missing Python dependencies

3. Fix and redeploy:
```bash
git add . && git commit -m "Fix startup issue"
git push origin main
```

---

#### Service runs but returns 500 errors
**Error:** All requests return `500 Internal Server Error`

**Symptoms:**
- Service is running
- `/api/health` returns 500
- All endpoints return errors

**Solution:**
1. Check logs for error details:
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 20
```

2. Common causes:
   - Can't access Secret Manager: Check service account permissions
   - Environment variables missing: Verify `GCP_PROJECT_ID` is set
   - Python error: Check Python syntax and imports

3. Fix errors and redeploy

---

#### Cold starts are slow (15-30 seconds)
**Error:** First request after deployment is very slow

**Symptoms:**
- First request takes 15-30 seconds
- Subsequent requests are fast (< 1 second)
- Normal behavior for Cloud Run

**Solution:**
This is normal behavior. Cold start includes:
- Container initialization
- Python startup
- Flask app loading

To improve:
1. Increase memory allocation:
```bash
gcloud run deploy pharmko-app \
  --memory=512Mi \
  --region=us-central1
```

2. Use Cloud Run warming (keep-alive):
   - Configure with external monitoring tool
   - Or accept the cold start

---

#### Service runs out of memory
**Error:** `OOMKilled` or memory allocation errors

**Symptoms:**
- Service crashes unexpectedly
- Happens under load
- Logs show memory-related errors

**Solution:**
1. Increase memory:
```bash
gcloud run deploy pharmko-app \
  --memory=1Gi \
  --region=us-central1
```

2. Reduce memory footprint:
   - Clear cache periodically
   - Optimize npm/Python dependencies
   - Profile memory usage

---

### 🔴 Secret Manager Issues

#### Secret doesn't exist
**Error:** `secrets "gemini-api-key" does not exist`

**Symptoms:**
- When running test script
- When trying to access secret
- `gcloud secrets list` doesn't show it

**Solution:**
1. Create missing secrets:
```bash
./setup-gcp-secrets.sh
```

2. Or manually:
```bash
echo -n "YOUR_KEY" | gcloud secrets create gemini-api-key --data-file=-
```

---

#### Service account can't access secret
**Error:** `403 Forbidden` when accessing secret from service account

**Symptoms:**
- Local testing works
- Cloud Run fails with 403
- Secret exists but service account can't read it

**Solution:**
1. Grant permissions:
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

for secret in gemini-api-key fda-api-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member=serviceAccount:$SA_EMAIL \
    --role=roles/secretmanager.secretAccessor
done
```

2. Verify permissions:
```bash
gcloud secrets get-iam-policy gemini-api-key
# Should show the service account
```

---

#### Can't create secrets in Secret Manager
**Error:** `error (7): Permission denied` when creating secrets

**Symptoms:**
- `setup-gcp-secrets.sh` fails
- `gcloud secrets create` returns permission error
- User doesn't have permission

**Solution:**
1. Verify user has necessary roles:
```bash
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"
```

2. Grant Secret Manager Admin role:
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=user:$(gcloud config get-value account) \
  --role=roles/secretmanager.admin
```

---

### 🟠 API Rate Limiting Issues

#### Getting rate limit errors from FDA/Gemini APIs
**Error:** `429 Too Many Requests` or `quota exceeded`

**Symptoms:**
- Requests fail intermittently
- More failures under load
- Error messages mention rate limit

**Solution:**
1. Add API key to requests (we do this):
```python
# FDA requests include api_key
# Gemini requests use authenticated API key
```

2. Implement exponential backoff:
   - Current code does this
   - No additional changes needed

3. Spread requests:
   - Space out multiple analyses
   - Use caching where possible

4. Check API quotas in Google Cloud Console:
   - APIs & Services → Quotas
   - Request quota increase if needed

---

## 📋 Diagnostic Commands

### Verify All Systems
```bash
# Test script
npm run test-secrets

# Backend
curl http://localhost:5000/api/health

# Frontend (in browser)
fetch('http://localhost:5000/api/health').then(r => r.json()).then(console.log)

# Cloud Run
curl $(gcloud run services describe pharmko-app --format='value(status.url)' --region us-central1)/api/health

# Secrets
gcloud secrets list
gcloud secrets get-iam-policy gemini-api-key

# Service Account
gcloud iam service-accounts get-iam-policy ${PROJECT_ID}@appspot.gserviceaccount.com

# Cloud Run Service
gcloud run services describe pharmko-app --region us-central1

# Recent Builds
gcloud builds list --limit 5

# Recent Logs
gcloud run logs read pharmko-app --region us-central1 --limit 20
```

---

## 🆘 When All Else Fails

1. **Check Everything:**
```bash
npm run test-secrets
```

2. **Restart Services:**
```bash
# Backend
pkill -f "python main.py"
cd backend && python main.py

# Or Docker Compose
docker-compose down
docker-compose up
```

3. **Review Recent Changes:**
```bash
git diff HEAD~5
git log --oneline -10
```

4. **Clean and Rebuild:**
```bash
docker-compose down -v
rm -rf node_modules
npm install
docker-compose build --no-cache
docker-compose up
```

5. **Check Documentation:**
   - `SECRETS_SETUP.md` - Setup issues
   - `IMPLEMENTATION.md` - Technical details
   - `QUICK_REFERENCE.md` - Common commands

---

## 📞 Getting Help

1. **Documentation:**
   - SECRETS_SETUP.md
   - IMPLEMENTATION.md
   - MIGRATION.md

2. **Logs:**
   - `gcloud run logs read pharmko-app`
   - Backend console output
   - Browser console (F12)

3. **Community:**
   - Google Cloud Discord
   - Stack Overflow
   - GitHub Issues

---

**Last Updated:** November 26, 2025
