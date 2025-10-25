gcloud init
gcloud auth login
gcloud auth application-default login
gcloud config set project ultra-evening-475901-c7
gcloud config set run/region us-east1
# Create instance
gcloud sql instances create pharmko-sql \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-east1

# Create DB and user
gcloud sql databases create pharmko --instance=pharmadb
gcloud sql users set-password postgres --instance=pharmadb --password="CHOOSE_A_STRONG_PASSWORD"
