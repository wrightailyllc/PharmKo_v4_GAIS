# -------- Stage 1: build Vite frontend --------
FROM node:20-slim AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# -------- Stage 2: run Express backend + static frontend --------
FROM node:20-slim
WORKDIR /app

# Install runtime deps only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend + backend + server entrypoint
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/backend ./backend

# Cloud Run will inject PORT=8080
ENV PORT=8080
EXPOSE 8080

# *** THIS IS THE IMPORTANT PART ***
CMD ["node", "server.js"]
