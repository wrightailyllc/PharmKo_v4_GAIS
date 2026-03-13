#!/usr/bin/env bash
# ============================================================================
# PharmKo GCP Infrastructure Setup Script
# ============================================================================
#
# One-time setup for GCP resources required by the Cloud Build pipeline.
# Run this script before the first Cloud Build deployment.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Sufficient IAM permissions (Owner or Editor on the GCP project)
#
# Usage:
#   chmod +x scripts/gcp-setup.sh
#   ./scripts/gcp-setup.sh
#
# This script is idempotent -- safe to run multiple times.
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

PROJECT_ID="pharmawatch-project1"
REGION="us-central1"
SERVICE_ACCOUNT_NAME="pharmko-cloudrun-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
AR_REPO_NAME="pharmko-repo"
SQL_INSTANCE_NAME="pharmko-db"
SQL_DATABASE_NAME="pharmko"
SQL_USER_NAME="pharmko"

echo "============================================"
echo " PharmKo GCP Infrastructure Setup"
echo "============================================"
echo ""
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo ""

# ============================================================================
# Step 1: Set the GCP project
# ============================================================================

echo "--- Step 1: Setting GCP project ---"
gcloud config set project "${PROJECT_ID}"
echo "Project set to ${PROJECT_ID}"
echo ""

# ============================================================================
# Step 2: Enable required APIs
# ============================================================================

echo "--- Step 2: Enabling required APIs ---"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iam.googleapis.com
echo "All required APIs enabled."
echo ""

# ============================================================================
# Step 3: Create Artifact Registry repository
# ============================================================================

echo "--- Step 3: Creating Artifact Registry repository ---"
if gcloud artifacts repositories describe "${AR_REPO_NAME}" --location="${REGION}" &>/dev/null; then
  echo "Artifact Registry repository '${AR_REPO_NAME}' already exists. Skipping."
else
  gcloud artifacts repositories create "${AR_REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="PharmKo container images"
  echo "Created Artifact Registry repository '${AR_REPO_NAME}'."
fi
echo ""

# ============================================================================
# Step 4: Create dedicated service account
# ============================================================================

echo "--- Step 4: Creating dedicated service account ---"
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" &>/dev/null; then
  echo "Service account '${SERVICE_ACCOUNT_NAME}' already exists. Skipping."
else
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name="PharmKo Cloud Run SA"
  echo "Created service account '${SERVICE_ACCOUNT_NAME}'."
fi
echo ""

# ============================================================================
# Step 5: Grant IAM roles to the service account
# ============================================================================

echo "--- Step 5: Granting IAM roles to service account ---"
ROLES=(
  "roles/secretmanager.secretAccessor"
  "roles/cloudsql.client"
  "roles/storage.objectAdmin"
  "roles/logging.logWriter"
)

for ROLE in "${ROLES[@]}"; do
  echo "  Granting ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="${ROLE}" \
    --quiet > /dev/null
done
echo "All IAM roles granted to ${SERVICE_ACCOUNT_NAME}."
echo ""

# ============================================================================
# Step 6: Grant Cloud Build permissions to deploy to Cloud Run
# ============================================================================

echo "--- Step 6: Granting Cloud Build deployment permissions ---"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "  Granting roles/run.admin to Cloud Build SA..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin" \
  --quiet > /dev/null

echo "  Granting roles/iam.serviceAccountUser to Cloud Build SA..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet > /dev/null

echo "Cloud Build SA (${CLOUD_BUILD_SA}) granted deployment permissions."
echo ""

# ============================================================================
# Step 7: Create Cloud SQL PostgreSQL instance
# ============================================================================

echo "--- Step 7: Creating Cloud SQL PostgreSQL instance ---"
if gcloud sql instances describe "${SQL_INSTANCE_NAME}" &>/dev/null; then
  echo "Cloud SQL instance '${SQL_INSTANCE_NAME}' already exists. Skipping."
else
  echo "Creating Cloud SQL PostgreSQL instance (this takes 5-10 minutes)..."
  gcloud sql instances create "${SQL_INSTANCE_NAME}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-size=10GB \
    --storage-type=HDD
  echo "Created Cloud SQL instance '${SQL_INSTANCE_NAME}'."
fi
echo ""
echo "  NOTE: Set the postgres password separately:"
echo "    gcloud sql users set-password postgres --instance=${SQL_INSTANCE_NAME} --password=YOUR_PASSWORD_HERE"
echo ""

# ============================================================================
# Step 8: Create database and user
# ============================================================================

echo "--- Step 8: Creating database and user ---"
gcloud sql databases create "${SQL_DATABASE_NAME}" --instance="${SQL_INSTANCE_NAME}" 2>/dev/null \
  && echo "Created database '${SQL_DATABASE_NAME}'." \
  || echo "Database '${SQL_DATABASE_NAME}' already exists."

echo ""
echo "  NOTE: Create the SQL user and store the password as a secret:"
echo "    gcloud sql users create ${SQL_USER_NAME} --instance=${SQL_INSTANCE_NAME} --password=YOUR_SECURE_PASSWORD"
echo "    echo -n 'YOUR_SECURE_PASSWORD' | gcloud secrets create cloud-sql-password --data-file=-"
echo "  Or update the existing secret:"
echo "    echo -n 'YOUR_SECURE_PASSWORD' | gcloud secrets versions add cloud-sql-password --data-file=-"
echo ""

# ============================================================================
# Step 9: Verify Secret Manager secrets
# ============================================================================

echo "--- Step 9: Verifying Secret Manager secrets ---"
echo ""
echo "Existing secrets in Secret Manager:"
gcloud secrets list --format="table(name)"
echo ""
echo "The app expects these secret names:"
echo "  - gemini-api-key"
echo "  - fda-api-key"
echo "  - google-oauth-client-id"
echo "  - google-oauth-client-secret"
echo "  - facebook-app-id"
echo "  - facebook-app-secret"
echo "  - cloud-sql-password"
echo "  - gcs-bucket-name"
echo ""
echo "Verify the names above match or create/rename as needed."
echo ""

# ============================================================================
# Done
# ============================================================================

echo "============================================"
echo " Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Set the postgres root password (see Step 7 note above)"
echo "  2. Create the SQL user and store password as a secret (see Step 8 note above)"
echo "  3. Verify all 8 secret names exist in Secret Manager (see Step 9 above)"
echo "  4. Push to main branch to trigger the first Cloud Build deployment"
echo ""
