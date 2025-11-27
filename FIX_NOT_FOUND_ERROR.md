# ❌ FIX: "Not Found" Error on Cloud Run

## The Problem

```
Not Found
The requested URL was not found on the server.
```

### What's Happening

1. ❌ React app not built (`dist/` folder missing)
2. ❌ Backend doesn't have static files to serve
3. ❌ Flask returns 404 because there's no index.html

---

## The Fix (Step by Step)

### Step 1: Build the React App Locally

```bash
npm install
npm run build
```

**This creates the `dist/` folder** with your compiled React app.

### Step 2: Verify the Build

```bash
Test-Path dist
Get-ChildItem dist
```

You should see:
```
    Directory: C:\Users\jwright\Documents\GitHub\PharmKo_v4_GAIS\dist

Mode                 LastWriteTime         Length Name
----                 -----------           ------ ----
-a---           11/26/2025  3:45 PM            892 index.html
d----           11/26/2025  3:45 PM              assets
```

### Step 3: Push to GitHub

```bash
git add dist/
git commit -m "Add built React app"
git push origin main
```

### Step 4: Cloud Build Will Automatically Deploy

Cloud Build trigger will:
1. ✅ See your push to main
2. ✅ Build the Docker image (now includes React from dist/)
3. ✅ Deploy to Cloud Run
4. ✅ App will work!

---

## Alternative: Use the Deploy Script

```bash
chmod +x deploy-to-gcloud.sh
./deploy-to-gcloud.sh
```

This script handles building React automatically.

---

## Verification Steps

### Step 1: Check React Build
```bash
Test-Path dist/index.html
```
Should return: `True`

### Step 2: Check Build Log
```bash
$BUILD_ID = gcloud builds list --limit=1 --format="value(id)"
gcloud builds log $BUILD_ID
```
Look for: `Successfully tagged gcr.io/...`

### Step 3: Check Deployment
```bash
gcloud run services list --region us-central1
```
Should show: `pharmko-app`

### Step 4: Test the URL
```bash
$URL = gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
Write-Host $URL
```

Then open that URL in your browser.

### Step 5: Test Health Endpoint
```bash
$URL = gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
curl "$URL/api/health"
```
Should return: `{"status":"healthy"}`

---

## Complete Quick Fix

**Run these exact commands in order:**

```bash
# 1. Build React
npm install
npm run build

# 2. Verify build exists
Test-Path dist/index.html

# 3. Commit and push
git add dist/
git commit -m "Add React build"
git push origin main

# 4. Wait 2-3 minutes for Cloud Build to complete
Start-Sleep -Seconds 150

# 5. Get your live URL
$URL = gcloud run services describe pharmko-app --region us-central1 --format='value(status.url)'
Write-Host "Your app is live at: $URL"

# 6. Test it
curl "$URL/api/health"
```

---

## Why This Happened

### The Old Problem:
- App had hardcoded API keys in config.ts
- Couldn't commit to GitHub
- Had to use Docker build args
- Build had to happen on GCP

### The New Solution:
- **API keys are now in Secret Manager**
- **No secrets in Docker build**
- **React can be built locally and committed**
- **Much simpler deployment**

---

## Important: .gitignore

**Before you `git add dist/`**, make sure `dist/` is NOT in your `.gitignore`:

```bash
cat .gitignore | grep dist
```

If it returns `dist`, you need to remove it from .gitignore:

```bash
# Open .gitignore
# Remove or comment out the line that says "dist"
# Save the file
```

Or just check what's in .gitignore:

```bash
Get-Content .gitignore
```

---

## Still Getting "Not Found"?

### Check 1: Is the service deployed?
```bash
gcloud run services describe pharmko-app --region us-central1
```
If error: Service doesn't exist yet, wait for Cloud Build to finish

### Check 2: Is it getting requests?
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 20
```
Look for HTTP requests

### Check 3: Is React build in Docker image?
```bash
# Get the image URL
$IMAGE = gcloud run services describe pharmko-app --region us-central1 --format='value(spec.template.spec.containers[0].image)'
Write-Host $IMAGE

# Or check build log
$BUILD_ID = gcloud builds list --limit=1 --format="value(id)"
gcloud builds log $BUILD_ID | Select-String "dist"
```

### Check 4: Is Flask serving static files?
```bash
curl "https://your-service-url/index.html"
```
Should return HTML (not JSON)

---

## What the Fix Does

### Before:
```
Request → Cloud Run → Flask → No static files → 404 Not Found ❌
```

### After:
```
Request → Cloud Run → Flask → Serves dist/index.html → App loads ✅
         └─ Also serves:
            /api/health
            /api/secrets/gemini-key
            /api/secrets/fda-key
```

---

## The Correct Flow Now

```
1. User opens URL
   ↓
2. Cloud Run receives request
   ↓
3. Flask backend is running
   ↓
4. Flask serves dist/index.html (React app)
   ↓
5. React loads in browser
   ↓
6. React calls /api/health (works)
   ↓
7. User enters drug name
   ↓
8. React calls /api/secrets/gemini-key
   ↓
9. Backend retrieves from Secret Manager
   ↓
10. Frontend gets key and calls Gemini API ✅
```

---

## Summary

**Your "Not Found" error is fixed by:**

1. ✅ Build React locally: `npm run build`
2. ✅ Commit dist/: `git add dist/; git commit -m "..."; git push`
3. ✅ Cloud Build auto-deploys
4. ✅ Flask now has static files to serve
5. ✅ App works!

**Time to fix:** 5-10 minutes

---

## Need More Help?

See:
- `GCP_DEPLOYMENT_GUIDE.md` - Full deployment walkthrough
- `TROUBLESHOOTING.md` - Other common issues
- `QUICK_REFERENCE.md` - Command reference
