# Build stage
FROM node:20-alpine AS deps

WORKDIR /app

# Install latest npm and dependencies with caching
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@latest && \
    npm ci --prefer-offline --no-audit

FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Create app user/group and data directory
RUN groupadd -r bunkbot && \
    useradd -r -g bunkbot -s /bin/false bunkbot && \
    mkdir -p /app/data && \
    chown -R bunkbot:bunkbot /app

# Install ffmpeg only
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy build artifacts and node modules in a single layer
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Install latest npm and production dependencies
RUN npm install -g npm@latest && \
    npm ci --prefer-offline --no-audit --production && \
    chown -R bunkbot:bunkbot /app

# Environment variables
ENV NODE_ENV="production"

# Switch to non-root user
USER bunkbot

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Run the bot
CMD ["node", "--enable-source-maps", "dist/bunkbot.js"]
