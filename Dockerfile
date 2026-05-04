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

# Run the Flask app with gunicorn (2 workers, 300s timeout for long API calls)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "300", "main:app"]
