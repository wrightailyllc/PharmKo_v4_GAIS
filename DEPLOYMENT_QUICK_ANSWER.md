# 🚀 Google Cloud Deployment - Quick Answer

## Your Question: "How Do I Assign Keys When Deploying?"

**Short Answer:** Keys go in **TWO places**:

1. **Cloud Build Trigger** (substitution variables) - Used during build
2. **Google Cloud Secret Manager** - Used at runtime

---

## 🎯 The Simplest Path (Copy & Paste)

### Step 1: Run the Deployment Script (2 minutes)

```bash
chmod +x deploy-to-gcloud.sh
./deploy-to-gcloud.sh
```

**The script will:**
- Ask for your Google Cloud Project ID
- Enable all required APIs
- Ask for your API keys
- Create secrets in Secret Manager
- Grant permissions
- Commit and push your code
- Monitor the build
- Give you the live URL

**That's it! You're done!** 🎉

---

## 🔧 Manual Deployment (If You Prefer)

### Step 1: Set Up Google Cloud (2 minutes)

```bash
# Set your project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

### Step 2: Create Secrets (1 minute)

```bash
# Create Gemini secret
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Create FDA secret
echo -n "YOUR_FDA_API_KEY" | gcloud secrets create fda-api-key --data-file=-
```

### Step 3: Grant Permissions (1 minute)

```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

### Step 4: Set Up Cloud Build Trigger (2 minutes) - IMPORTANT ⭐

**Go to:** https://console.cloud.google.com/cloud-build/triggers

**Click:** "CREATE TRIGGER"

**Configure:**
```
Name: pharmko-app-trigger
Event: Push to a branch
Repository: PharmKo_v4_GAIS
Branch: ^main$
Configuration: cloudbuild.yaml
```

**Scroll down and click "Show and run settings"**

**Add Substitutions:**
- Variable: `_GEMINI_API_KEY` → Value: Your key
- Variable: `_FDA_API_KEY` → Value: Your key

**Click: "CREATE TRIGGER"**

### Step 5: Deploy (1 minute)

```bash
git push origin main
```

**Done!** Cloud Build automatically:
- Builds your Docker image
- Pushes to Container Registry
- Deploys to Cloud Run

**Get your live URL:**
```bash
gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
```

---

## 📍 Where Your Keys Go

```
Your API Keys
├─ Gemini API Key
└─ FDA API Key
     ↓
You put them in 2 places:

1️⃣ Cloud Build Trigger (for build-time)
   ├─ _GEMINI_API_KEY (substitution variable)
   └─ _FDA_API_KEY (substitution variable)
   
2️⃣ Google Cloud Secret Manager (for runtime)
   ├─ gemini-api-key (encrypted)
   └─ fda-api-key (encrypted)
```

---

## 🔄 Flow: How It Works

```
You push code to GitHub
         ↓
Cloud Build Trigger activated
         ↓
Reads _GEMINI_API_KEY and _FDA_API_KEY from trigger
         ↓
Uses them to create secrets in Secret Manager
         ↓
Builds Docker image (NO keys baked in ✅)
         ↓
Pushes to Container Registry
         ↓
Deploys to Cloud Run
         ↓
When app runs:
  Backend requests secrets from Secret Manager
  Frontend gets secrets from backend
  Everything uses secrets securely ✅
```

---

## 🎯 Critical: Where to Put Keys

### ❌ DON'T PUT THEM HERE:
- In source code
- In Docker images
- In git history
- In frontend code
- In environment variables in code
- In configuration files

### ✅ PUT THEM HERE:
- Cloud Build Trigger substitution variables (for build)
- Google Cloud Secret Manager (for runtime)

---

## ⚡ Three Ways to Deploy

### Way 1: The Script (EASIEST)
```bash
./deploy-to-gcloud.sh
# Answer the prompts - done!
```

### Way 2: The Setup Script
```bash
./setup-gcp-secrets.sh  # Create secrets
# Then set up Cloud Build trigger manually
git push origin main
```

### Way 3: Full Manual
Follow all the steps above

---

## ✅ Verification Checklist

After deployment, verify:

```
Secrets created?
gcloud secrets list
# Should show: gemini-api-key, fda-api-key

Service running?
gcloud run services list
# Should show: pharmko-app

Service healthy?
curl YOUR_SERVICE_URL/api/health
# Should return: {"status": "healthy"}

App working?
Open YOUR_SERVICE_URL in browser
Try drug search
Verify analysis works
```

---

## 🔄 Updating Keys Later (No Redeployment!)

**This is the magic part** - update keys without redeploying code:

```bash
# Update Gemini key
echo -n "NEW_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Update FDA key
echo -n "NEW_KEY" | gcloud secrets versions add fda-api-key --data-file=-
```

**Done!** Backend automatically uses new version on next request. ✨

---

## 🐛 If Something Goes Wrong

### Build Failed?
```bash
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

### App Won't Start?
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

### Permission Error?
```bash
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key --member=serviceAccount:$SA_EMAIL --role=roles/secretmanager.secretAccessor
gcloud secrets add-iam-policy-binding fda-api-key --member=serviceAccount:$SA_EMAIL --role=roles/secretmanager.secretAccessor
```

### Substitution Variable Error?
```
Go to Cloud Build → Triggers
Edit your trigger
Scroll to "Substitutions"
Make sure _GEMINI_API_KEY and _FDA_API_KEY are set
Save
Retry build: git push origin main
```

---

## 📊 What Gets Baked Into Docker Image?

```
✅ Gets baked in:
- Your React app code
- Python Flask backend code
- Configuration files
- Dependencies

❌ Does NOT get baked in:
- API keys ✅
- Secrets ✅
- Credentials ✅

Why? The Dockerfile doesn't reference them!
Keys come from Secret Manager at runtime.
```

---

## 🎓 Understanding Each Step

### Cloud Build Trigger
- **Purpose:** Watches GitHub for pushes
- **What it needs:** Your API keys (as substitution variables)
- **What it does:** Runs cloudbuild.yaml when you push
- **Where keys go:** `_GEMINI_API_KEY` and `_FDA_API_KEY` variables

### Secret Manager
- **Purpose:** Stores and encrypts secrets
- **What it gets:** Keys created during build
- **What it provides:** Backend can read them at runtime
- **Where keys go:** `gemini-api-key` and `fda-api-key` secrets

### Cloud Run
- **Purpose:** Runs your app
- **What it has:** Flask backend + React frontend
- **What it needs:** `GCP_PROJECT_ID` environment variable
- **What it does:** Backend fetches secrets on-demand

---

## 💡 Pro Tips

### Tip 1: Use the Script
```bash
./deploy-to-gcloud.sh
```
It handles everything and is less error-prone.

### Tip 2: Check Logs Frequently
```bash
gcloud run logs read pharmko-app --stream
```
Follow logs in real-time while troubleshooting.

### Tip 3: Save Your Service URL
```bash
gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
```
Bookmark it for easy access!

### Tip 4: Rotate Keys Regularly
```bash
echo -n "NEW_KEY" | gcloud secrets versions add secret-name --data-file=-
```
Rotate quarterly for security.

### Tip 5: Multiple Regions
Deploy to other regions without changing code:
```bash
gcloud run deploy pharmko-app --image=gcr.io/$PROJECT_ID/pharmko-app:latest --region=us-west1
```

---

## 📞 Related Documentation

- **GCP_DEPLOYMENT_GUIDE.md** - Detailed deployment steps
- **API_KEYS_VISUAL_GUIDE.md** - Visual guide with diagrams
- **SECRETS_SETUP.md** - Secret Manager setup
- **QUICK_REFERENCE.md** - Common commands
- **TROUBLESHOOTING.md** - Problem solving

---

## 🎉 TL;DR

```
1. Run: ./deploy-to-gcloud.sh
2. Answer the prompts
3. Wait for build
4. Get your URL
5. Done! 🚀
```

**Or manually:**
```
1. Create secrets: gcloud secrets create ...
2. Grant permissions: gcloud secrets add-iam-policy-binding ...
3. Set up Cloud Build trigger with substitution variables
4. Push code: git push origin main
5. Done! 🚀
```

---

**Ready?** 

👉 **Start with:** `./deploy-to-gcloud.sh`

👉 **Or read:** `GCP_DEPLOYMENT_GUIDE.md`

👉 **Questions?** See `TROUBLESHOOTING.md`
