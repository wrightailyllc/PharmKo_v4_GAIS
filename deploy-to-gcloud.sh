#!/bin/bash

# deploy-to-gcloud.sh
# Complete deployment script from local to Google Cloud
# This script does everything needed to deploy your PharmKo app

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  PharmKo - Google Cloud Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Step 1: Get project ID
echo -e "${YELLOW}Step 1: Set up Google Cloud Project${NC}"
read -p "Enter your Google Cloud Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID cannot be empty${NC}"
    exit 1
fi

export PROJECT_ID
gcloud config set project $PROJECT_ID

echo -e "${GREEN}✓ Project set to: $PROJECT_ID${NC}"
echo ""

# Step 2: Enable APIs
echo -e "${YELLOW}Step 2: Enabling Required APIs${NC}"
echo "This may take a minute..."

gcloud services enable run.googleapis.com 2>/dev/null || true
gcloud services enable cloudbuild.googleapis.com 2>/dev/null || true
gcloud services enable containerregistry.googleapis.com 2>/dev/null || true
gcloud services enable secretmanager.googleapis.com 2>/dev/null || true
gcloud services enable iam.googleapis.com 2>/dev/null || true

echo -e "${GREEN}✓ APIs enabled${NC}"
echo ""

# Step 3: Get all secret values
echo -e "${YELLOW}Step 3: Enter Your API Keys and Secrets${NC}"
echo "All 9 secrets required by cloudbuild.yaml will be created."
echo ""

read -sp "Gemini API Key (hidden): " GEMINI_KEY; echo ""
read -sp "FDA API Key (hidden): " FDA_KEY; echo ""
read -sp "Google OAuth Client ID (hidden): " GOOGLE_OAUTH_CLIENT_ID; echo ""
read -sp "Google OAuth Client Secret (hidden): " GOOGLE_OAUTH_CLIENT_SECRET; echo ""
read -sp "Facebook App ID (hidden): " FACEBOOK_APP_ID; echo ""
read -sp "Facebook App Secret (hidden): " FACEBOOK_APP_SECRET; echo ""
read -sp "Cloud SQL Password (hidden): " CLOUD_SQL_PASSWORD; echo ""
read -p  "GCS Bucket Name: " GCS_BUCKET_NAME
read -p  "PharmKo Admin Email: " PHARMKO_ADMIN_EMAIL

if [ -z "$GEMINI_KEY" ] || [ -z "$FDA_KEY" ] || [ -z "$GOOGLE_OAUTH_CLIENT_ID" ] || \
   [ -z "$GOOGLE_OAUTH_CLIENT_SECRET" ] || [ -z "$FACEBOOK_APP_ID" ] || \
   [ -z "$FACEBOOK_APP_SECRET" ] || [ -z "$CLOUD_SQL_PASSWORD" ] || \
   [ -z "$GCS_BUCKET_NAME" ] || [ -z "$PHARMKO_ADMIN_EMAIL" ]; then
    echo -e "${RED}Error: All 9 secrets are required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Secrets received${NC}"
echo ""

# Step 4: Create / update all 9 secrets in Secret Manager
echo -e "${YELLOW}Step 4: Creating Secrets in Secret Manager${NC}"

# Helper: create-or-update a secret
upsert_secret() {
    local NAME="$1"
    local VALUE="$2"
    if gcloud secrets describe "$NAME" --project=$PROJECT_ID &>/dev/null; then
        echo "Updating existing $NAME..."
        echo -n "$VALUE" | gcloud secrets versions add "$NAME" --data-file=- --project=$PROJECT_ID
    else
        echo "Creating new $NAME..."
        echo -n "$VALUE" | gcloud secrets create "$NAME" \
            --data-file=- \
            --project=$PROJECT_ID \
            --replication-policy="automatic"
    fi
}

upsert_secret "gemini-api-key"            "$GEMINI_KEY"
upsert_secret "fda-api-key"               "$FDA_KEY"
upsert_secret "google-oauth-client-id"    "$GOOGLE_OAUTH_CLIENT_ID"
upsert_secret "google-oauth-client-secret" "$GOOGLE_OAUTH_CLIENT_SECRET"
upsert_secret "facebook-app-id"           "$FACEBOOK_APP_ID"
upsert_secret "facebook-app-secret"       "$FACEBOOK_APP_SECRET"
upsert_secret "cloud-sql-password"        "$CLOUD_SQL_PASSWORD"
upsert_secret "gcs-bucket-name"           "$GCS_BUCKET_NAME"
upsert_secret "pharmko-admin-email"       "$PHARMKO_ADMIN_EMAIL"

echo -e "${GREEN}✓ All 9 secrets created/updated${NC}"
echo ""

# Step 5: Grant permissions
echo -e "${YELLOW}Step 5: Granting Service Account Permissions${NC}"

export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

ALL_SECRETS=(
    gemini-api-key fda-api-key google-oauth-client-id google-oauth-client-secret
    facebook-app-id facebook-app-secret cloud-sql-password gcs-bucket-name pharmko-admin-email
)

for SECRET in "${ALL_SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding "$SECRET" \
      --member=serviceAccount:$SA_EMAIL \
      --role=roles/secretmanager.secretAccessor \
      --project=$PROJECT_ID &>/dev/null
done

echo -e "${GREEN}✓ Permissions granted to service account${NC}"
echo ""

# Step 6: Verify all secrets
echo -e "${YELLOW}Step 6: Verifying Secrets${NC}"

MISSING=0
for SECRET in "${ALL_SECRETS[@]}"; do
    if gcloud secrets describe "$SECRET" --project=$PROJECT_ID &>/dev/null; then
        echo -e "${GREEN}✓ $SECRET exists${NC}"
    else
        echo -e "${RED}✗ $SECRET not found${NC}"
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    echo -e "${RED}Error: One or more secrets are missing. Aborting.${NC}"
    exit 1
fi

echo ""

# Step 7: Commit and push code
echo -e "${YELLOW}Step 7: Committing Code${NC}"

if ! git status &>/dev/null; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

git add .
git commit -m "Configure for Google Cloud deployment" || true

echo -e "${GREEN}✓ Code committed${NC}"
echo ""

# Step 8: Push to trigger build
echo -e "${YELLOW}Step 8: Pushing to Trigger Cloud Build${NC}"

git push origin main

echo -e "${GREEN}✓ Code pushed${NC}"
echo ""

# Step 9: Wait for build
echo -e "${YELLOW}Step 9: Building and Deploying${NC}"
echo "This will take 2-5 minutes..."
echo ""

# Get the latest build
sleep 5
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")

# Watch the build
gcloud builds log $BUILD_ID --stream

echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""

# Step 10: Get service URL
echo -e "${YELLOW}Step 10: Getting Service URL${NC}"

SERVICE_URL=$(gcloud run services describe pharmko-app \
  --region=us-central1 \
  --format='value(status.url)' \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${YELLOW}Service still deploying... checking in 10 seconds${NC}"
    sleep 10
    SERVICE_URL=$(gcloud run services describe pharmko-app \
      --region=us-central1 \
      --format='value(status.url)' \
      --project=$PROJECT_ID 2>/dev/null || echo "")
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Your app is live at:${NC}"
echo -e "${YELLOW}$SERVICE_URL${NC}"
echo ""

# Test the service
echo -e "${YELLOW}Testing service health...${NC}"
if curl -s "$SERVICE_URL/api/health" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Service is healthy!${NC}"
else
    echo -e "${YELLOW}! Service may still be starting...${NC}"
    echo "Try again in 30 seconds"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Open in browser: $SERVICE_URL"
echo "2. Test drug search"
echo "3. Verify analysis works"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "  gcloud run logs read pharmko-app --region us-central1 --stream"
echo ""
echo -e "${BLUE}To update API keys later (no redeployment needed):${NC}"
echo "  echo -n 'NEW_KEY' | gcloud secrets versions add gemini-api-key --data-file=-"
echo ""
echo -e "${GREEN}Done!${NC}"
