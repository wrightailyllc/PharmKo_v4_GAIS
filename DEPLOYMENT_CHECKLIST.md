# Deployment Checklist

Use this checklist to ensure your Secrets Manager integration is properly set up before deploying to production.

## ✅ Pre-Deployment Checklist

### 1. Local Development Setup
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] gcloud CLI installed and updated
- [ ] Google Cloud project created
- [ ] gcloud CLI authenticated: `gcloud auth login`
- [ ] Project set: `gcloud config set project YOUR_PROJECT_ID`

### 2. Code Review
- [ ] Reviewed changes in `services/secretManager.ts`
- [ ] Reviewed changes in `services/geminiService.ts`
- [ ] Reviewed changes in `config.ts` - no hardcoded keys visible
- [ ] Confirmed `backend/main.py` has proper error handling
- [ ] No API keys in any `.tsx` or `.ts` files
- [ ] No API keys in `Dockerfile` or `cloudbuild.yaml`

### 3. Local Testing
- [ ] Environment variables set:
  - [ ] `GCP_PROJECT_ID`
  - [ ] `GEMINI_API_KEY`
  - [ ] `FDA_API_KEY`
- [ ] Backend starts: `cd backend && python main.py`
  - [ ] No errors on startup
  - [ ] Listens on port 5000
- [ ] Frontend starts: `npm run dev`
  - [ ] Listens on port 5173
  - [ ] Can reach backend
- [ ] Test endpoints:
  - [ ] `curl http://localhost:5000/api/health`
  - [ ] `curl http://localhost:5000/api/config`
  - [ ] `curl http://localhost:5000/api/secrets/gemini-key`
- [ ] Frontend works:
  - [ ] Can load pages
  - [ ] Can search for drugs
  - [ ] API calls complete successfully

### 4. Docker Testing
- [ ] Docker installed
- [ ] Docker Compose file updated
- [ ] Environment variables in `.env` file or exported
- [ ] Docker Compose starts:
  ```bash
  docker-compose up
  ```
- [ ] Services start correctly
- [ ] No permission errors in logs

### 5. Google Cloud Setup
- [ ] Secrets created:
  - [ ] `gemini-api-key` exists
  - [ ] `fda-api-key` exists
  - [ ] `gcloud secrets list` shows both
- [ ] Verify secret values:
  - [ ] `gcloud secrets versions access latest --secret=gemini-api-key | head -c 20`...
  - [ ] `gcloud secrets versions access latest --secret=fda-api-key | head -c 20`...
- [ ] Service account identified:
  - [ ] `echo "${PROJECT_ID}@appspot.gserviceaccount.com"`
- [ ] Service account has permissions:
  - [ ] `gcloud secrets get-iam-policy gemini-api-key` includes service account
  - [ ] `gcloud secrets get-iam-policy fda-api-key` includes service account

### 6. Verification Script
- [ ] Verification script is executable:
  ```bash
  chmod +x test-secrets.sh
  ```
- [ ] Run verification:
  ```bash
  npm run test-secrets
  ```
- [ ] All checks pass ✅

### 7. Cloud Build Configuration
- [ ] Cloud Build API enabled: `gcloud services enable cloudbuild.googleapis.com`
- [ ] Cloud Build trigger exists
- [ ] Trigger has substitution variables:
  - [ ] `_GEMINI_API_KEY` set
  - [ ] `_FDA_API_KEY` set
- [ ] Trigger is connected to correct GitHub repo
- [ ] Trigger build configuration set to `cloudbuild.yaml`

### 8. Cloud Run Configuration
- [ ] Cloud Run API enabled: `gcloud services enable run.googleapis.com`
- [ ] Existing Cloud Run service (if any) backed up or noted
- [ ] Service account has necessary roles:
  - [ ] `roles/secretmanager.secretAccessor`
  - [ ] `roles/cloudbuild.builds.editor` (for Cloud Build)

### 9. Git Repository
- [ ] All changes committed:
  ```bash
  git status  # Should show clean working directory
  ```
- [ ] Sensitive files NOT added:
  - [ ] `.env.local` not committed (add to .gitignore if not already)
  - [ ] `*.pyc` not committed
  - [ ] `node_modules/` not committed
- [ ] .gitignore updated properly
- [ ] Ready to push:
  ```bash
  git log --oneline -5  # See recent commits
  ```

### 10. Documentation
- [ ] Updated SECRETS_SETUP.md with your project-specific info
- [ ] Documented your substitution variables
- [ ] Recorded your Cloud Run service name
- [ ] Saved Cloud Build trigger name

## 🚀 Deployment Steps

### Step 1: Final Verification
```bash
npm run test-secrets
```
Expected output: All checks pass ✅

### Step 2: Commit Changes
```bash
git add .
git commit -m "Configure Google Cloud Secrets Manager

- Move API keys to Secret Manager
- Add Flask backend for secret retrieval
- Update frontend to fetch secrets from backend
- Remove hardcoded credentials from Docker
- Implement secure deployment pipeline"
```

### Step 3: Trigger Build
```bash
git push origin main
```

### Step 4: Monitor Build
```bash
# Get the build ID
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")

# Watch the build
gcloud builds log $BUILD_ID --stream
```

Expected steps in build log:
1. ✅ Build Docker image
2. ✅ Create secrets in Secret Manager
3. ✅ Grant permissions
4. ✅ Deploy to Cloud Run

### Step 5: Verify Deployment
```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe pharmko-app \
  --region us-central1 \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"

# Test the service
curl $SERVICE_URL/api/health
curl $SERVICE_URL/api/config
```

Expected responses:
- `{"status": "healthy"}`
- `{"ready": true, "message": "..."}`

### Step 6: Test Application
1. Open the Cloud Run service URL in your browser
2. Test the application:
   - [ ] Landing page loads
   - [ ] Can log in
   - [ ] Drug search works
   - [ ] Analysis completes
   - [ ] Report displays correctly

### Step 7: Monitor Logs
```bash
# Stream logs
gcloud run logs read pharmko-app --region us-central1 --stream

# Filter for errors
gcloud run logs read pharmko-app --region us-central1 \
  --format json | jq '.[] | select(.severity=="ERROR")'
```

## 🔍 Post-Deployment Verification

### Success Criteria ✅
- [ ] Cloud Run service is running
- [ ] Service URL is accessible
- [ ] Application loads without errors
- [ ] Drug analysis works end-to-end
- [ ] No hardcoded credentials in logs
- [ ] No permission errors
- [ ] Response times are acceptable (< 3 seconds)

### Performance Checks
- [ ] First page load: < 2 seconds
- [ ] Drug search: < 5 seconds
- [ ] Analysis: < 30 seconds (depends on APIs)
- [ ] No memory leaks: Memory usage stable over time

### Security Checks
- [ ] No API keys in Cloud Run logs
- [ ] No API keys in error messages
- [ ] Secrets are being retrieved from Secret Manager
- [ ] Access logs are being recorded
- [ ] Service account permissions are minimal

## 📊 Rollback Plan (If Needed)

If deployment fails:

1. **Quick Rollback** (revert to previous version):
```bash
# Get the previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=pharmko-app \
  --region=us-central1 \
  --format="value(name)" --limit=2 | tail -1)

# Traffic to previous revision
gcloud run services update-traffic pharmko-app \
  --to-revisions=$PREVIOUS_REVISION=100 \
  --region=us-central1
```

2. **Investigate Failure**:
```bash
# Check latest build logs
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID

# Check service logs
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

3. **Fix and Redeploy**:
```bash
# After fixing issues
git add .
git commit -m "Fix deployment issue"
git push origin main
# Build and deployment will restart automatically
```

## 📞 Support & Troubleshooting

### Build Fails
1. Check build logs: `gcloud builds log BUILD_ID`
2. Verify cloudbuild.yaml syntax
3. Check substitution variables are set
4. Test locally first: `docker build .`

### Runtime Errors
1. Check Cloud Run logs: `gcloud run logs read`
2. Verify environment variables: `gcloud run services describe`
3. Test backend locally: `python backend/main.py`
4. Check Secret Manager access

### Performance Issues
1. Check Cloud Run memory/CPU settings
2. Monitor Secret Manager API calls
3. Check network latency to APIs
4. Review Application Performance Monitoring

### Security Issues
1. Review Secret Manager access logs
2. Check service account permissions
3. Audit recent deployments
4. Review security policies

## ✨ Success!

Once all checks pass, you've successfully:
- ✅ Migrated to Google Cloud Secrets Manager
- ✅ Removed API keys from source code
- ✅ Implemented secure credential management
- ✅ Deployed to Cloud Run with automatic CI/CD
- ✅ Set up monitoring and logging

**Congratulations!** Your app is now more secure and production-ready. 🎉

---

**Date Completed:** _______________
**Deployed By:** _______________
**Build ID:** _______________
**Service URL:** _______________

Print and save this checklist for future reference!
