# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Stage 1: Build frontend and backend
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

# Install native build tools for bcrypt / better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build the frontend (Vite/React)
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Build the backend (Express/TypeScript)
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/. .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime image
# ------------------------------------------------------------------------------
FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

WORKDIR /app

# Backend runtime artifacts
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/migrations ./server/migrations
COPY --from=builder /app/server/package.json ./server/package.json

# Frontend static build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
