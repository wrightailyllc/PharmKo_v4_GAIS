# 🎯 YOUR EXACT ANSWER: Google Cloud Deployment with Keys

## Your Question
> "When I go to run this in gcloud 'deploy an application', how do I assign the keys and etc?"

## Your Answer (Step by Step)

### The Easiest Way (Copy & Paste)

```bash
chmod +x deploy-to-gcloud.sh
./deploy-to-gcloud.sh
```

**This ONE script does everything:**
1. Enables Google Cloud APIs
2. Creates secrets for your API keys
3. Grants permissions
4. Pushes your code
5. Triggers Cloud Build
6. Gives you the live URL

**That's literally it!**

---

## Or If You Want to Do It Manually

### Step 1: Create Secrets in Google Cloud

```bash
# Your Gemini API key goes here
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Your FDA API key goes here
echo -n "YOUR_FDA_API_KEY" | gcloud secrets create fda-api-key --data-file=-
```

### Step 2: Grant Permissions

```bash
export PROJECT_ID="your-project-id"
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

### Step 3: Set Up Cloud Build Trigger

**Go to:** https://console.cloud.google.com/cloud-build/triggers

**Click "CREATE TRIGGER" and fill in:**
- Name: `pharmko-app-trigger`
- Event: `Push to a branch`
- Branch: `^main$`
- Configuration: `cloudbuild.yaml`

**⭐ IMPORTANT: Add Substitution Variables**

Scroll to "Show and run settings" and add:
- Variable name: `_GEMINI_API_KEY` → Value: Your Gemini key
- Variable name: `_FDA_API_KEY` → Value: Your FDA key

**Click "CREATE TRIGGER"**

### Step 4: Deploy

```bash
git push origin main
```

**That's it!** Cloud Build automatically deploys everything.

---

## Where Your Keys Go (Visual)

```
Your API Keys
    ↓
Google Cloud Secret Manager (Encrypted)
    ├─ gemini-api-key
    └─ fda-api-key
    ↓
Cloud Build Trigger reads them during build
    ├─ _GEMINI_API_KEY (substitution)
    └─ _FDA_API_KEY (substitution)
    ↓
Backend at runtime requests from Secret Manager
    ↓
Frontend gets from backend
    ↓
App uses keys securely ✅
```

---

## Three Key Files to Know

1. **deploy-to-gcloud.sh** - Automated deployment script
2. **GCP_DEPLOYMENT_GUIDE.md** - Full step-by-step guide
3. **API_KEYS_VISUAL_GUIDE.md** - Visual explanation with diagrams

---

## Testing Your Deployment

```bash
# Get your live URL
gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'

# Test it works
curl YOUR_SERVICE_URL/api/health
# Should return: {"status": "healthy"}

# View logs
gcloud run logs read pharmko-app --region us-central1 --stream
```

---

## One More Thing: Updating Keys Later

The beauty of this setup? **Update keys without redeploying code:**

```bash
echo -n "NEW_GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
echo -n "NEW_FDA_KEY" | gcloud secrets versions add fda-api-key --data-file=-
```

Done! Your backend automatically uses the new keys on the next request.

---

## What Actually Happens When You Deploy

```
You run: git push origin main
    ↓
Cloud Build Trigger activates
    ↓
Reads: _GEMINI_API_KEY and _FDA_API_KEY from trigger
    ↓
Runs: cloudbuild.yaml
    ├─ docker build (creates your app image)
    ├─ gcloud secrets create (stores keys in Secret Manager)
    ├─ docker push (sends image to Google Container Registry)
    └─ gcloud run deploy (runs your app)
    ↓
Your app is live! ✅
```

---

## The Complete List of What Gets Stored Where

| Item | Where | Why |
|------|-------|-----|
| Gemini API Key | Secret Manager | Encrypted at rest |
| FDA API Key | Secret Manager | Encrypted at rest |
| Build substitution vars | Cloud Build Trigger | Used during build only |
| Docker image | Container Registry | Image without keys |
| App code | Cloud Run | Running service |
| Logs | Cloud Logging | For debugging |

---

## Summary

**You have TWO options:**

### Option 1: Automated (5 minutes)
```bash
./deploy-to-gcloud.sh
```

### Option 2: Step by Step (10 minutes)
Follow the 4 steps above

**Either way:**
- Your API keys end up in Google Cloud Secret Manager
- They're encrypted and secure
- Your backend retrieves them at runtime
- Your frontend never sees them
- Your Docker image doesn't contain them

---

## Common Questions Answered

**Q: Where exactly do I paste my API key?**
A: Two places:
1. When running `./deploy-to-gcloud.sh` (script will ask)
2. Cloud Build Trigger substitution variables (manually)

**Q: Will my keys be exposed?**
A: No! They're encrypted in Secret Manager and never baked into Docker images.

**Q: How do I update my keys later?**
A: `echo -n "NEW_KEY" | gcloud secrets versions add secret-name --data-file=-`

**Q: What if I get an error?**
A: Check `TROUBLESHOOTING.md` or run `gcloud run logs read pharmko-app --limit 50`

**Q: Can I use a different region?**
A: Yes! Add `--region=REGION_NAME` to any `gcloud run` command.

---

## Files You Just Got

- ✅ `deploy-to-gcloud.sh` - Deployment script
- ✅ `GCP_DEPLOYMENT_GUIDE.md` - Detailed guide
- ✅ `API_KEYS_VISUAL_GUIDE.md` - Visual explanations
- ✅ `DEPLOYMENT_QUICK_ANSWER.md` - This file
- ✅ Plus 12+ other documentation files

---

## Next Step: START HERE

```bash
chmod +x deploy-to-gcloud.sh
./deploy-to-gcloud.sh
```

Or if you prefer manual control:
```bash
# Read the guide
cat GCP_DEPLOYMENT_GUIDE.md

# Or the visual guide
cat API_KEYS_VISUAL_GUIDE.md
```

---

## Success Looks Like This

After running deployment:
```
Service URL: https://pharmko-app-xxxxx.run.app
✅ Health check passes
✅ Drug search works
✅ Analysis generates reports
✅ No errors in logs
```

---

**That's your complete answer!** 🚀

Your API keys go into Google Cloud Secret Manager, which your backend accesses securely at runtime. Everything is encrypted, automated, and production-ready.
