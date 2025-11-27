#!/bin/bash

# setup-gcp-secrets.sh - Helper script to set up Google Cloud Secrets Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Google Cloud Secrets Setup${NC}"
echo -e "${YELLOW}================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Using project: $PROJECT_ID${NC}"

# Prompt for API keys
echo ""
echo -e "${YELLOW}Enter your API credentials:${NC}"
read -p "Gemini API Key: " GEMINI_KEY
read -p "FDA API Key: " FDA_KEY

if [ -z "$GEMINI_KEY" ] || [ -z "$FDA_KEY" ]; then
    echo -e "${RED}Error: Both API keys are required${NC}"
    exit 1
fi

# Create secrets
echo ""
echo -e "${YELLOW}Creating secrets in Google Cloud Secret Manager...${NC}"

# Create or update Gemini secret
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -n "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ Updated gemini-api-key${NC}"
else
    echo -n "$GEMINI_KEY" | gcloud secrets create gemini-api-key \
        --data-file=- \
        --project=$PROJECT_ID \
        --replication-policy="automatic"
    echo -e "${GREEN}✓ Created gemini-api-key${NC}"
fi

# Create or update FDA secret
if gcloud secrets describe fda-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -n "$FDA_KEY" | gcloud secrets versions add fda-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓ Updated fda-api-key${NC}"
else
    echo -n "$FDA_KEY" | gcloud secrets create fda-api-key \
        --data-file=- \
        --project=$PROJECT_ID \
        --replication-policy="automatic"
    echo -e "${GREEN}✓ Created fda-api-key${NC}"
fi

# Grant permissions to Cloud Run service account
echo ""
echo -e "${YELLOW}Granting permissions to Cloud Run service account...${NC}"

# Try to find the Cloud Run service account
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Cloud Run service account" \
  --format="value(email)" \
  --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$SA_EMAIL" ]; then
    # Try the default App Engine service account
    SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
fi

echo -e "${YELLOW}Service account: $SA_EMAIL${NC}"

# Grant secret accessor role
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID &>/dev/null
echo -e "${GREEN}✓ Granted access to gemini-api-key${NC}"

gcloud secrets add-iam-policy-binding fda-api-key \
  --member=serviceAccount:$SA_EMAIL \
  --role=roles/secretmanager.secretAccessor \
  --project=$PROJECT_ID &>/dev/null
echo -e "${GREEN}✓ Granted access to fda-api-key${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your Cloud Build Trigger substitution variables:"
echo "   - _GEMINI_API_KEY: $GEMINI_KEY"
echo "   - _FDA_API_KEY: $FDA_KEY"
echo ""
echo "2. Push to your repository to trigger a build:"
echo "   git push origin main"
echo ""
echo "3. Monitor the deployment:"
echo "   gcloud run logs read pharmko-app --region us-central1 --limit 50"
