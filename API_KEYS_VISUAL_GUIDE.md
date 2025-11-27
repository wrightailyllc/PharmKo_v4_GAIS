# API Key Assignment - Visual Guide

## The Simplest Way (Step by Step)

### You Have These API Keys:
```
Gemini API Key:  AIzaSy...xxxxx
FDA API Key:     M7xeeL...xxxxx
```

### Three Ways to Assign Them:

---

## Method 1️⃣: Using the Interactive Script (EASIEST)

```bash
./setup-gcp-secrets.sh
```

**The script will ask you:**
```
Enter your API credentials:
Gemini API Key: [You paste here]
FDA API Key: [You paste here]
```

**It will do all of this automatically:**
```
✅ Create gemini-api-key in Secret Manager
✅ Create fda-api-key in Secret Manager
✅ Give service account permission to read them
✅ Show you what's next
```

**Time:** 2 minutes ⏱️

---

## Method 2️⃣: Using the Google Cloud Console (VISUAL)

### Step A: Go to Secret Manager
1. Open https://console.cloud.google.com/security/secret-manager
2. Click **"Create Secret"** button

### Step B: Create First Secret
```
Name: gemini-api-key
Secret value: [Paste your Gemini API key]
Replication: Automatic
```
Click **"Create Secret"**

### Step C: Create Second Secret
```
Name: fda-api-key
Secret value: [Paste your FDA API key]
Replication: Automatic
```
Click **"Create Secret"**

### Step D: Grant Permissions
1. Click on `gemini-api-key`
2. Click **"Grant Access"** button
3. Select **"Service Accounts"**
4. Search for: `{YOUR_PROJECT_ID}@appspot.gserviceaccount.com`
5. Select role: `Secret Manager Secret Accessor`
6. Click **"Save"**

Repeat Step D for `fda-api-key`

**Time:** 5 minutes ⏱️

---

## Method 3️⃣: Using Command Line (FASTEST IF YOU KNOW GCLOUD)

```bash
# Set your project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create Gemini secret
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets create gemini-api-key --data-file=-

# Create FDA secret
echo -n "YOUR_FDA_API_KEY_HERE" | gcloud secrets create fda-api-key --data-file=-

# Grant permissions
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

**Time:** 3 minutes ⏱️

---

## Step 2: Set Up Cloud Build Trigger (Where to Put Keys for Deployment)

### Go to Cloud Build Console
https://console.cloud.google.com/cloud-build/triggers

### Click "CREATE TRIGGER"

### Fill in these fields:

```
Name: pharmko-app-trigger

Event: Push to a branch

Repository: your-github-repo

Branch: ^main$

Configuration: cloudbuild.yaml
```

### ⭐ MOST IMPORTANT: Add Substitution Variables

These are where you put your keys for the build process!

**Scroll down to "Show and run settings"**

**Click "Add variable"**

**First Variable:**
```
Variable name: _GEMINI_API_KEY
Value: [Paste your Gemini API key]
```

**Second Variable:**
```
Variable name: _FDA_API_KEY
Value: [Paste your FDA API key]
```

### Click "CREATE TRIGGER"

---

## Now Deploy: It's Just One Command!

```bash
git push origin main
```

**That's it!** Here's what happens automatically:

```
1. GitHub sends webhook to Cloud Build
2. Cloud Build reads _GEMINI_API_KEY substitution
3. Cloud Build reads _FDA_API_KEY substitution
4. Build runs cloudbuild.yaml:
   ├─ Builds Docker image
   ├─ Creates secrets in Secret Manager (if not exist)
   ├─ Pushes image to Container Registry
   └─ Deploys to Cloud Run
5. Your app is live! 🚀
```

---

## Flow Diagram

```
Your Computer
     ↓
git push origin main
     ↓
GitHub Webhook
     ↓
Cloud Build Trigger Activated
     ↓
Cloud Build reads:
├─ cloudbuild.yaml (how to build)
├─ _GEMINI_API_KEY (from substitution)
├─ _FDA_API_KEY (from substitution)
└─ Your code (from GitHub)
     ↓
Build executes:
├─ docker build (creates image)
├─ gcloud secrets create (stores keys in Secret Manager)
├─ docker push (pushes to Container Registry)
└─ gcloud run deploy (deploys to Cloud Run)
     ↓
App is Live!
     ↓
When backend runs:
├─ Reads GCP_PROJECT_ID env var
├─ Authenticates to Google Cloud
├─ Requests secret from Secret Manager
├─ Returns to frontend
└─ Frontend uses key for API calls
```

---

## Where Your Keys Go

### During Build (Temporary)
```
Substitution Variables in Cloud Build Trigger
  ├─ _GEMINI_API_KEY
  └─ _FDA_API_KEY
  
Used ONLY during build to:
├─ Create secrets in Secret Manager
└─ Not baked into Docker image ✅
```

### During Runtime (Secure)
```
Secret Manager (Encrypted)
  ├─ gemini-api-key (encrypted at rest)
  └─ fda-api-key (encrypted at rest)
  
Backend retrieves:
├─ Authenticates with service account
├─ Requests secret from Secret Manager
├─ Caches in memory (per request)
└─ Returns to frontend
```

### Frontend
```
Frontend gets key
  ├─ Fetches from backend API endpoint
  ├─ Never stores in localStorage ✅
  ├─ Never visible in browser console ✅
  └─ Uses for API call
```

---

## Security Summary

### ✅ What's Secure
- Keys never in source code
- Keys never in Docker image
- Keys never in git history
- Keys encrypted at rest
- Keys encrypted in transit
- Keys managed centrally
- Easy key rotation (no code change needed)

### ❌ What's NOT Secure
- Don't commit keys to git
- Don't hardcode keys in config files
- Don't put keys in environment variables in code
- Don't store keys in localStorage on frontend

---

## Checklist: Did You Do These?

- [ ] Created secret: `gemini-api-key` in Secret Manager
- [ ] Created secret: `fda-api-key` in Secret Manager
- [ ] Granted service account permission to read `gemini-api-key`
- [ ] Granted service account permission to read `fda-api-key`
- [ ] Created Cloud Build trigger
- [ ] Added substitution variable: `_GEMINI_API_KEY`
- [ ] Added substitution variable: `_FDA_API_KEY`
- [ ] Pushed code to `main` branch
- [ ] Cloud Build built successfully
- [ ] Cloud Run service is live
- [ ] Tested with `curl YOUR_SERVICE_URL/api/health`

---

## Quick Reference Commands

### Create Secrets
```bash
echo -n "KEY_VALUE" | gcloud secrets create secret-name --data-file=-
```

### Update Secrets (No Redeployment!)
```bash
echo -n "NEW_KEY_VALUE" | gcloud secrets versions add secret-name --data-file=-
```

### List Secrets
```bash
gcloud secrets list
```

### Grant Permissions
```bash
gcloud secrets add-iam-policy-binding secret-name \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

### Get Service URL
```bash
gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
```

### View Logs
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

### View Build Logs
```bash
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID
```

---

## Troubleshooting

### Q: "Substitution variable not found"
**A:** You didn't add substitution variables to Cloud Build trigger. Go back and add:
- `_GEMINI_API_KEY`
- `_FDA_API_KEY`

### Q: "Permission denied" in logs
**A:** Service account can't read secrets. Run:
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

### Q: "Secret not found"
**A:** You didn't create the secrets. Run:
```bash
echo -n "YOUR_KEY" | gcloud secrets create gemini-api-key --data-file=-
echo -n "YOUR_KEY" | gcloud secrets create fda-api-key --data-file=-
```

### Q: Build succeeded but app doesn't work
**A:** Check logs:
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 20
```

---

## 5-Minute Quick Start

```bash
# 1. Create secrets (1 min)
./setup-gcp-secrets.sh

# 2. Create trigger in Cloud Console (2 min)
# https://console.cloud.google.com/cloud-build/triggers
# Add _GEMINI_API_KEY and _FDA_API_KEY substitutions

# 3. Deploy (1 min)
git push origin main

# 4. Wait for build (1 min)
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)") --stream

# Done! Get URL:
gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
```

---

## The Most Important Thing to Remember

### Your keys go in TWO places:

1. **Cloud Build Trigger** (for build-time setup)
   - `_GEMINI_API_KEY` substitution
   - `_FDA_API_KEY` substitution
   
2. **Google Cloud Secret Manager** (for runtime access)
   - `gemini-api-key` secret
   - `fda-api-key` secret

That's it! Everything else is automatic! 🚀

---

For detailed help, see:
- `GCP_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `SECRETS_SETUP.md` - Detailed secret setup
- `TROUBLESHOOTING.md` - Problem solving
- `QUICK_REFERENCE.md` - Common commands
