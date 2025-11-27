# Google Cloud Secrets Manager Setup Guide

This document explains how to set up your PharmKo app with Google Cloud Secrets Manager to securely manage API keys.

## Overview

The app now uses a three-tier architecture:
1. **Frontend (React)** - No longer stores API keys
2. **Backend (Flask)** - Requests secrets from Google Cloud Secret Manager
3. **Google Cloud Secret Manager** - Stores and manages API credentials

## Prerequisites

- Google Cloud Project with Cloud Run enabled
- `gcloud` CLI installed and authenticated
- Service Account with Secret Manager access (created automatically for Cloud Run)

## Step 1: Create Secrets in Google Cloud Secret Manager

```bash
# Set your GCP project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create the Gemini API key secret
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Create the FDA API key secret
echo -n "YOUR_FDA_API_KEY_HERE" | gcloud secrets create fda-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

## Step 2: Configure Cloud Build Trigger

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Create or edit your trigger
3. Add the following **substitution variables**:
   - `_GEMINI_API_KEY`: Your Gemini API key
   - `_FDA_API_KEY`: Your FDA API key

These values will be used to create/update the secrets in Secret Manager during the build process.

## Step 3: Deploy

Push to your repository to trigger the Cloud Build pipeline:

```bash
git push origin main
```

The `cloudbuild.yaml` will:
1. Build your Docker image (no API keys baked in)
2. Create secrets in Secret Manager (if they don't exist)
3. Deploy to Cloud Run with `GCP_PROJECT_ID` environment variable set
4. Grant the Cloud Run service account access to read secrets

## Step 4: Grant Service Account Permissions

The Cloud Run service account needs permission to read secrets:

```bash
# Get your Cloud Run service account email
export SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Cloud Run service account" \
  --format="value(email)")

# Or use the default Compute Engine service account
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant Secret Accessor role for each secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

## Step 5: Local Development

For local development, you can run the backend with environment variables:

```bash
# Terminal 1: Start the backend
cd backend
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your_key_here"
export FDA_API_KEY="your_key_here"
python main.py

# Terminal 2: Start the frontend (in a new terminal)
npm run dev
```

The frontend will call `http://localhost:5000/api/secrets/*` to fetch keys from the backend.

## Updating Secrets

To update an API key:

```bash
# Update Gemini API key
echo -n "NEW_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=-

# Update FDA API key
echo -n "NEW_KEY" | gcloud secrets versions add fda-api-key \
  --data-file=-
```

## Monitoring

Monitor secret access in Cloud Logging:

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com" \
  --limit 50 \
  --format json
```

## Troubleshooting

### "Failed to retrieve secret" error

1. Verify the secret exists:
```bash
gcloud secrets list
```

2. Verify the service account has access:
```bash
gcloud secrets get-iam-policy gemini-api-key
```

3. Check Cloud Run logs:
```bash
gcloud run logs read pharmko-app --region us-central1 --limit 50
```

### Backend not responding

1. Check if Cloud Run service is deployed:
```bash
gcloud run services list
```

2. Check service account has the correct roles:
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*"
```

## Security Best Practices

✅ **What we're doing now:**
- API keys never stored in code
- API keys never committed to version control
- API keys never baked into Docker images
- Secrets centrally managed
- Easy rotation without code changes
- Access logged and auditable

✅ **Additional recommendations:**
- Rotate API keys regularly
- Use separate API keys for different environments (dev, staging, prod)
- Monitor secret access in Cloud Logging
- Use service accounts with minimal permissions (least privilege)
- Enable secret version history for auditing

## Docker Build Arguments (NO LONGER USED)

The old approach of passing secrets via Docker build args (`--build-arg`) has been removed. This was insecure because:
- Secrets would be baked into the Docker image
- Secrets would appear in Docker build history
- Secrets would be visible in any container filesystem inspection

The new approach is much more secure! ✅
