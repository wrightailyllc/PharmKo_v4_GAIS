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

# Step 3: Get API keys
echo -e "${YELLOW}Step 3: Enter Your API Keys${NC}"
read -sp "Enter your Gemini API Key (will be hidden): " GEMINI_KEY
echo ""
read -sp "Enter your FDA API Key (will be hidden): " FDA_KEY
echo ""

if [ -z "$GEMINI_KEY" ] || [ -z "$FDA_KEY" ]; then
    echo -e "${RED}Error: Both API keys are required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API keys received${NC}"
echo ""

# Step 4: Create secrets
echo -e "${YELLOW}Step 4: Creating Secrets in Secret Manager${NC}"

# Check if secrets exist
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
    echo "Updating existing gemini-api-key..."
    echo -n "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key \
        --data-file=- \
        --project=$PROJECT_ID
else
    echo "Creating new gemini-api-key..."
    echo -n "$GEMINI_KEY" | gcloud secrets create gemini-api-key \
        --data-file=- \
        --project=$PROJECT_ID \
        --replication-policy="automatic"
fi

if gcloud secrets describe fda-api-key --project=$PROJECT_ID &>/dev/null; then
    echo "Updating existing fda-api-key..."
    echo -n "$FDA_KEY" | gcloud secrets versions add fda-api-key \
        --data-file=- \
        --project=$PROJECT_ID
else
    echo "Creating new fda-api-key..."
    echo -n "$FDA_KEY" | gcloud secrets create fda-api-key \
        --data-file=- \
        --project=$PROJECT_ID \
        --replication-policy="automatic"
fi

echo -e "${GREEN}✓ Secrets created${NC}"
echo ""

# Step 5: Grant permissions
echo -e "${YELLOW}Step 5: Granting Service Account Permissions${NC}"

export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID &>/dev/null

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID &>/dev/null

echo -e "${GREEN}✓ Permissions granted to service account${NC}"
echo ""

# Step 6: Verify secrets
echo -e "${YELLOW}Step 6: Verifying Secrets${NC}"

if gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ gemini-api-key exists${NC}"
else
    echo -e "${RED}✗ gemini-api-key not found${NC}"
    exit 1
fi

if gcloud secrets describe fda-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ fda-api-key exists${NC}"
else
    echo -e "${RED}✗ fda-api-key not found${NC}"
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
