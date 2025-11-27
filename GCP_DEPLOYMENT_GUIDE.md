# Google Cloud Deployment Guide - Step by Step

## Overview

This guide walks you through deploying your PharmKo app to Google Cloud Run with proper API key assignment.

---

## Prerequisites

Before you start, make sure you have:
- [ ] Google Cloud account (create at https://cloud.google.com)
- [ ] A Google Cloud project created
- [ ] gcloud CLI installed (`gcloud --version` to check)
- [ ] GitHub repository with your code pushed
- [ ] Your API keys ready:
  - [ ] Gemini API key (from https://ai.google.dev/gemini-api/docs/api-key)
  - [ ] FDA API key (from https://open.fda.gov/apis/authentication/)

---

## Step 1: Initial Setup (5 minutes)

### 1.1 Set Your Project ID
```bash
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

### 1.2 Enable Required APIs
```bash
# Enable Cloud Run
gcloud services enable run.googleapis.com

# Enable Cloud Build
gcloud services enable cloudbuild.googleapis.com

# Enable Container Registry
gcloud services enable containerregistry.googleapis.com

# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# Enable IAM
gcloud services enable iam.googleapis.com
```

Check they're enabled:
```bash
gcloud services list --enabled | grep -E "run|build|container|secret|iam"
```

---

## Step 2: Create Secrets in Google Cloud (5 minutes)

### Option A: Interactive Setup (Recommended)
```bash
chmod +x setup-gcp-secrets.sh
./setup-gcp-secrets.sh
```

This script will:
1. Ask for your API keys
2. Create secrets in Secret Manager
3. Grant permissions to service account
4. Show you the configuration

### Option B: Manual Setup

**Create Gemini API key secret:**
```bash
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

**Create FDA API key secret:**
```bash
echo -n "YOUR_FDA_API_KEY_HERE" | gcloud secrets create fda-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

**Verify secrets were created:**
```bash
gcloud secrets list
```

You should see:
- `gemini-api-key`
- `fda-api-key`

---

## Step 3: Grant Service Account Permissions (5 minutes)

The service account needs permission to read secrets.

### 3.1 Find Your Service Account Email
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
echo $SA_EMAIL
```

### 3.2 Grant Secret Accessor Role
```bash
# For Gemini key
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID

# For FDA key
gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID
```

### 3.3 Verify Permissions
```bash
gcloud secrets get-iam-policy gemini-api-key
gcloud secrets get-iam-policy fda-api-key
```

Both should show your service account email as having `roles/secretmanager.secretAccessor`

---

## Step 4: Configure Cloud Build Trigger (5 minutes)

This is where you set up automatic deployment from GitHub.

### 4.1 Go to Cloud Build Console
1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click **"CREATE TRIGGER"**

### 4.2 Configure the Trigger

**Name:**
```
pharmko-app-trigger
```

**Event:** Select **"Push to a branch"**

**Repository:** 
- Click "Connect new repository"
- Select **GitHub**
- Authenticate with GitHub
- Select your repository: **PharmKo_v4_GAIS**

**Branch:**
```
^main$
```

**Configuration:**
- Select **"Cloud Build configuration file (yaml)"`
- Filename: `cloudbuild.yaml`

### 4.3 Add Substitution Variables ⚠️ IMPORTANT

These are your API keys that Cloud Build will use to create/update secrets.

**Click "Show and run settings"**

**Add Substitutions:**

1. First substitution:
   - **Variable name:** `_GEMINI_API_KEY`
   - **Value:** Your actual Gemini API key (paste here)

2. Second substitution:
   - **Variable name:** `_FDA_API_KEY`
   - **Value:** Your actual FDA API key (paste here)

**IMPORTANT:** 
- These variables are stored securely by Google Cloud
- They're only used during build time
- They're not baked into the final Docker image
- You can edit them anytime without redeploying code

### 4.4 Save the Trigger
Click **"CREATE"**

---

## Step 5: Deploy Your Application (2 minutes)

### 5.1 Push Code to Trigger Build

```bash
# Make sure everything is committed
git status  # Should show nothing or only untracked files

# If not committed, commit now
git add .
git commit -m "Configure Google Cloud Secrets Manager deployment"

# Push to trigger the build
git push origin main
```

### 5.2 Monitor the Build

**In the console:**
1. Go to https://console.cloud.google.com/cloud-build/builds
2. Click on the latest build to watch it
3. You should see:
   - ✅ Step 1: Build Docker image
   - ✅ Step 2: Create secrets in Secret Manager
   - ✅ Step 3: Grant permissions
   - ✅ Step 4: Push image to Container Registry
   - ✅ Step 5: Deploy to Cloud Run

**Or from terminal:**
```bash
# Watch the latest build
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID --stream
```

---

## Step 6: Access Your Deployed App (1 minute)

### 6.1 Get Your Service URL

**From console:**
1. Go to https://console.cloud.google.com/run
2. Click **"pharmko-app"**
3. Copy the service URL

**From terminal:**
```bash
gcloud run services describe pharmko-app \
  --region=us-central1 \
  --format='value(status.url)'
```

### 6.2 Test Your App

```bash
# Test health endpoint
curl https://YOUR_SERVICE_URL/api/health

# Should return:
# {"status": "healthy"}
```

**Then:**
1. Open the URL in your browser
2. Test the drug search functionality
3. Verify analysis works end-to-end

---

## Updating API Keys (Without Redeploying Code)

One of the major benefits of this setup is updating keys without code changes!

### Update Method 1: Add New Secret Version
```bash
# Update Gemini key
echo -n "NEW_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=-

# Update FDA key
echo -n "NEW_FDA_API_KEY" | gcloud secrets versions add fda-api-key \
  --data-file=-
```

**That's it!** The backend automatically uses the new version on the next request.

### Update Method 2: Via Console
1. Go to https://console.cloud.google.com/security/secret-manager
2. Click on a secret (e.g., `gemini-api-key`)
3. Click **"Create new version"**
4. Paste the new key
5. Click **"Create secret version"**

---

## Troubleshooting Deployment

### Build Fails with "substitution variable not found"

**Problem:** The substitution variables aren't set in the trigger

**Solution:**
1. Go to Cloud Build → Triggers
2. Click on your trigger
3. Click **"Edit"**
4. Scroll down to **"Substitutions"**
5. Add or update:
   - `_GEMINI_API_KEY` = your key
   - `_FDA_API_KEY` = your key
6. Click **"Save"**
7. Trigger a new build: `git push origin main`

---

### Build Succeeds but Cloud Run Service Shows "Error"

**Problem:** Service crashed on startup

**Solution:**
```bash
# Check logs
gcloud run logs read pharmko-app --region us-central1 --limit 20

# Common issues:
# - Missing GCP_PROJECT_ID environment variable
# - Can't access Secret Manager
# - Python error in main.py
```

**Fix:**
1. Review the logs
2. Fix the issue
3. Commit and push: `git push origin main`
4. Cloud Build automatically retries

---

### "Permission denied" accessing secrets

**Problem:** Service account can't read secrets

**Solution:**
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant permissions again
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

# Wait 30 seconds for IAM to propagate
sleep 30

# Trigger a new deployment
git push origin main
```

---

### Service URL returns 404

**Problem:** Service is running but returns errors

**Solution:**
```bash
# Test health endpoint
curl https://YOUR_SERVICE_URL/api/health

# If 404, service is running but routes might be wrong
# Check the Flask backend is properly serving static files

# View recent logs
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

---

## Complete Deployment Checklist

Use this to verify everything is set up correctly:

- [ ] **APIs Enabled:**
  - [ ] Cloud Run
  - [ ] Cloud Build
  - [ ] Secret Manager
  - [ ] Container Registry

- [ ] **Secrets Created:**
  - [ ] `gemini-api-key` exists
  - [ ] `fda-api-key` exists

- [ ] **Permissions Granted:**
  - [ ] Service account can read `gemini-api-key`
  - [ ] Service account can read `fda-api-key`

- [ ] **Cloud Build Trigger:**
  - [ ] Trigger exists and is connected to GitHub
  - [ ] Branch is set to `main`
  - [ ] Configuration file is `cloudbuild.yaml`
  - [ ] Substitution variables are set:
    - [ ] `_GEMINI_API_KEY`
    - [ ] `_FDA_API_KEY`

- [ ] **Code Committed:**
  - [ ] All files committed to git
  - [ ] Code pushed to `main` branch

- [ ] **Deployment:**
  - [ ] Cloud Build trigger activated
  - [ ] Build completed successfully
  - [ ] Cloud Run service is running
  - [ ] Service URL is accessible
  - [ ] App works end-to-end

---

## Common Scenarios

### Scenario 1: First-Time Deployment

```bash
# 1. Set project
export PROJECT_ID="my-project"
gcloud config set project $PROJECT_ID

# 2. Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 3. Create secrets
./setup-gcp-secrets.sh

# 4. Configure trigger (via console - see Step 4)

# 5. Deploy
git push origin main

# 6. Test
SERVICE_URL=$(gcloud run services describe pharmko-app \
  --region=us-central1 \
  --format='value(status.url)')
curl $SERVICE_URL/api/health
```

### Scenario 2: Update API Keys

```bash
# Update in Secret Manager (no redeployment needed!)
echo -n "NEW_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Backend automatically uses the new key on next request
# No Cloud Build trigger needed!
```

### Scenario 3: Redeploy After Code Changes

```bash
# Just commit and push!
git add .
git commit -m "Fix bug in analysis"
git push origin main

# Cloud Build automatically:
# 1. Builds new Docker image
# 2. Pushes to Container Registry
# 3. Deploys to Cloud Run
# 4. Uses existing secrets (no changes needed)
```

### Scenario 4: Switch Region

```bash
# Deploy to different region
gcloud run deploy pharmko-app \
  --image=gcr.io/$PROJECT_ID/pharmko-app:latest \
  --region=us-west1  # Change region here
  --platform=managed \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID
```

---

## Monitoring Your Deployment

### View Recent Deployments
```bash
gcloud run revisions list --service=pharmko-app --region=us-central1
```

### View Logs
```bash
# Last 50 log entries
gcloud run logs read pharmko-app --region us-central1 --limit 50

# Stream logs in real-time
gcloud run logs read pharmko-app --region us-central1 --stream

# Filter for errors only
gcloud run logs read pharmko-app --region us-central1 \
  --format json | jq '.[] | select(.severity=="ERROR")'
```

### View Service Details
```bash
gcloud run services describe pharmko-app --region us-central1
```

### View Build History
```bash
# List last 10 builds
gcloud builds list --limit 10

# View specific build logs
gcloud builds log BUILD_ID
```

---

## Cost Considerations

### Estimated Monthly Cost

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Run | 1 million requests | ~$5 |
| Secret Manager | 2 secrets | ~$0.12 |
| Container Registry | Image storage | ~$0.10 |
| Total | | ~$5-10 |

**Note:** Free tier includes 2 million requests/month, so most deployments are free!

---

## Next Steps After Deployment

1. **Monitor Performance**
   - Set up Cloud Monitoring alerts
   - Track error rates and latency

2. **Backup Secrets**
   - Document secret names
   - Know how to recover if deleted

3. **Set Up Alerting**
   - High error rate
   - Unauthorized access attempts
   - Failed deployments

4. **Plan Scaling**
   - Cloud Run auto-scales by default
   - Increase memory if needed for large analyses

5. **Regular Maintenance**
   - Rotate API keys quarterly
   - Update dependencies monthly
   - Review logs weekly

---

## Support & Help

### If Something Goes Wrong

1. **Build failed?**
   ```bash
   gcloud builds log BUILD_ID | tail -50
   ```

2. **Service crashed?**
   ```bash
   gcloud run logs read pharmko-app --limit 50
   ```

3. **Can't access secrets?**
   ```bash
   gcloud secrets get-iam-policy gemini-api-key
   ```

4. **Need to rollback?**
   ```bash
   gcloud run deploy pharmko-app \
     --image=gcr.io/$PROJECT_ID/pharmko-app:PREVIOUS_SHA \
     --region=us-central1
   ```

### Documentation References

- See `SECRETS_SETUP.md` for detailed setup
- See `QUICK_REFERENCE.md` for common commands
- See `TROUBLESHOOTING.md` for problem solving
- See `DEPLOYMENT_CHECKLIST.md` for pre-deployment verification

---

**Ready to deploy?** Start with Step 1 and follow through!

For questions, see SECRETS_SETUP.md or TROUBLESHOOTING.md
