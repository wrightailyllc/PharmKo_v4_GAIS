# Stage 1: Build the React application
# Use a Debian-based Node image to avoid esbuild/native binary issues on Alpine (musl)
FROM node:20-bullseye-slim AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (NO API KEYS needed at build time anymore)
# RUN npm run build
CMD ["tail", "-f", "/dev/null"]

# Stage 2: Python backend with Flask
FROM python:3.11-slim

WORKDIR /app

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built React app from build stage
COPY --from=build /app/dist /app/dist

# Copy the Python backend
COPY backend/main.py ./


# Expose port 8080 (for Cloud Run)
EXPOSE 8080

# Set environment variables
ENV FLASK_APP=main.py
ENV PORT=8080

# Run the Flask app
CMD ["python", "main.py"]
