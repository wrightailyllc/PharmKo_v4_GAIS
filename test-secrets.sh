#!/bin/bash

# test-secrets.sh - Test script to verify Secrets Manager configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  Secrets Manager Configuration Test${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Check gcloud CLI
echo -e "${YELLOW}1. Checking gcloud CLI...${NC}"
if command -v gcloud &> /dev/null; then
    GCLOUD_VERSION=$(gcloud --version | head -1)
    echo -e "${GREEN}✓ gcloud installed: $GCLOUD_VERSION${NC}"
else
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    echo "  Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
echo ""
echo -e "${YELLOW}2. Checking authentication...${NC}"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
    echo -e "${GREEN}✓ Authenticated as: $ACCOUNT${NC}"
else
    echo -e "${RED}✗ Not authenticated${NC}"
    echo "  Run: gcloud auth login"
    exit 1
fi

# Check project
echo ""
echo -e "${YELLOW}3. Checking project...${NC}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ No project set${NC}"
    echo "  Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi
echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"

# Check secrets exist
echo ""
echo -e "${YELLOW}4. Checking secrets exist...${NC}"
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ gemini-api-key exists${NC}"
else
    echo -e "${RED}✗ gemini-api-key not found${NC}"
    echo "  Create it: echo 'YOUR_KEY' | gcloud secrets create gemini-api-key --data-file=-"
fi

if gcloud secrets describe fda-api-key --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ fda-api-key exists${NC}"
else
    echo -e "${RED}✗ fda-api-key not found${NC}"
    echo "  Create it: echo 'YOUR_KEY' | gcloud secrets create fda-api-key --data-file=-"
fi

# Check service account permissions
echo ""
echo -e "${YELLOW}5. Checking service account permissions...${NC}"
SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
echo -e "${BLUE}   Service account: $SA_EMAIL${NC}"

for secret in gemini-api-key fda-api-key; do
    if gcloud secrets get-iam-policy $secret --project=$PROJECT_ID 2>/dev/null | \
       grep -q "serviceAccount:$SA_EMAIL"; then
        echo -e "${GREEN}✓ $secret accessible${NC}"
    else
        echo -e "${YELLOW}! $secret may not be accessible to service account${NC}"
        echo "  Grant access: gcloud secrets add-iam-policy-binding $secret \\"
        echo "    --member=serviceAccount:$SA_EMAIL \\"
        echo "    --role=roles/secretmanager.secretAccessor"
    fi
done

# Check Cloud Run
echo ""
echo -e "${YELLOW}6. Checking Cloud Run service...${NC}"
if gcloud run services list --region us-central1 --project=$PROJECT_ID 2>/dev/null | \
   grep -q "pharmko-app"; then
    SERVICE_URL=$(gcloud run services describe pharmko-app \
        --region us-central1 \
        --project=$PROJECT_ID \
        --format="value(status.url)" 2>/dev/null || echo "")
    echo -e "${GREEN}✓ pharmko-app service deployed${NC}"
    if [ ! -z "$SERVICE_URL" ]; then
        echo -e "${BLUE}   URL: $SERVICE_URL${NC}"
    fi
else
    echo -e "${YELLOW}! pharmko-app service not deployed yet${NC}"
fi

# Check Cloud Build
echo ""
echo -e "${YELLOW}7. Checking Cloud Build history...${NC}"
BUILD_COUNT=$(gcloud builds list --project=$PROJECT_ID --limit=1 --format="value(id)" 2>/dev/null | wc -l)
if [ "$BUILD_COUNT" -gt 0 ]; then
    LATEST_BUILD=$(gcloud builds list --project=$PROJECT_ID --limit=1 --format="value(id,status)" 2>/dev/null)
    echo -e "${GREEN}✓ Latest build: $LATEST_BUILD${NC}"
else
    echo -e "${YELLOW}! No builds found${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Complete${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. If secrets don't exist, create them with setup-gcp-secrets.sh"
echo "2. To deploy, push to your repository:"
echo "   git push origin main"
echo "3. Monitor the build:"
echo "   gcloud builds log (build_id)"
echo "4. Check logs:"
echo "   gcloud run logs read pharmko-app --region us-central1"
