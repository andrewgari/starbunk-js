# BunkBot Container - Reply bots and admin commands
FROM node:20-slim AS builder

WORKDIR /app

# Copy shared dependencies first
COPY containers/shared/package*.json ./shared/
COPY containers/bunkbot/package*.json ./

# Install dependencies
RUN cd shared && npm ci && cd .. && npm ci

# Copy source code
COPY containers/shared ./shared
COPY containers/bunkbot ./
COPY prisma ./prisma

# Build shared package first, then link it and build container
RUN cd shared && npm run build && npm pack && cd .. && npm install ./shared/starbunk-shared-1.0.0.tgz && npx prisma generate && npm run build

# Production stage
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r bunkbot && useradd -r -g bunkbot bunkbot

# Install system dependencies
RUN apt-get update && \
    apt-get install -y openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/node_modules ./shared/node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client in runtime stage (before changing ownership)
RUN echo "Generating Prisma client..." && \
    npx prisma generate && \
    echo "Prisma client generated successfully" && \
    ls -la node_modules/.prisma/ || echo "No .prisma directory found"

# Set ownership
RUN chown -R bunkbot:bunkbot /app

USER bunkbot

EXPOSE 3000

CMD ["node", "dist/index.js"]
