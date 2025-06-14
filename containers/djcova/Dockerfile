# DJCova Container - Music service
FROM node:20-slim AS builder

WORKDIR /app

# Copy shared dependencies first
COPY containers/shared/package*.json ./shared/
COPY containers/djcova/package*.json ./

# Install dependencies
RUN cd shared && npm ci && cd .. && npm ci

# Copy source code
COPY containers/shared ./shared
COPY containers/djcova ./

# Build shared package first, then link it and build container
RUN cd shared && npm run build && npm pack && cd .. && npm install ./shared/starbunk-shared-1.0.0.tgz && npm run build

# Production stage
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r djcova && useradd -r -g djcova djcova

# Install system dependencies (including ffmpeg for audio processing)
RUN apt-get update && \
    apt-get install -y ffmpeg openssl python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/node_modules ./shared/node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R djcova:djcova /app

USER djcova

EXPOSE 3001

CMD ["node", "dist/index-minimal.js"]
