# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and lockfile, install deterministically
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (NO API KEYS needed at build time anymore)
RUN npm run build

# Stage 2: Python backend with Flask
FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built React app from build stage
COPY --from=build /app/dist /app/dist

# Copy the Python backend (all three modules)
COPY backend/main.py backend/gcloud_services.py backend/auth_service.py ./


# Expose port 8080 (for Cloud Run)
EXPOSE 8080

# Set environment variables
ENV FLASK_APP=main.py
ENV PORT=8080

# Create non-root user for security
RUN addgroup --system pharmko && adduser --system --ingroup pharmko pharmko
USER pharmko

# Health check so Cloud Run and orchestrators know when the container is ready
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/api/health || exit 1

# Run the Flask app with gunicorn (2 workers, 300s timeout for long API calls)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "300", "main:app"]
