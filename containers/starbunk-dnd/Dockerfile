# Starbunk-DND Container - D&D features and Snowbunk bridge
FROM node:20-slim AS builder

WORKDIR /app

# Copy shared dependencies first
COPY containers/shared/package*.json ./shared/
COPY containers/starbunk-dnd/package*.json ./

# Install dependencies
RUN cd shared && npm ci && cd .. && npm ci

# Copy source code
COPY containers/shared ./shared
COPY containers/starbunk-dnd ./

# Build shared package first, then link it and build container
RUN cd shared && npm run build && npm pack && cd .. && npm install ./shared/starbunk-shared-1.0.0.tgz && npm run build

# Production stage
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r starbunk-dnd && useradd -r -g starbunk-dnd starbunk-dnd

# Install system dependencies
RUN apt-get update && \
    apt-get install -y openssl python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/node_modules ./shared/node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R starbunk-dnd:starbunk-dnd /app

USER starbunk-dnd

EXPOSE 3002

CMD ["node", "dist/index-minimal.js"]
