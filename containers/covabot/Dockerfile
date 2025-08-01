# CovaBot Container - AI personality bot
# Optimized multi-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Dependencies - Cache npm dependencies separately
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++ openssl

# Copy package files for dependency installation
COPY containers/shared/package*.json ./shared/
COPY containers/covabot/package*.json ./

# Install shared dependencies (optimized for both Docker and Podman)
RUN cd shared && npm ci --only=production && npm ci && npm cache clean --force

# Install container dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Builder - Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY containers/shared/package*.json ./shared/
COPY containers/covabot/package*.json ./

# Install all dependencies (including dev) - optimized for both Docker and Podman
RUN cd shared && npm ci && cd .. && npm ci && npm cache clean --force

# Copy source code
COPY containers/shared ./shared
COPY containers/covabot ./

# Build shared package and container
RUN cd shared && npm run build && SHARED_TGZ=$(npm pack | tail -n1) && \
    cd .. && npm install "./shared/${SHARED_TGZ}" && \
    npm run build

# Stage 3: Runtime - Minimal production image
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only runtime system dependencies
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S covabot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G covabot covabot

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/shared/node_modules ./shared/node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package.json ./

# Set ownership and switch to non-root user
RUN chown -R covabot:covabot /app
USER covabot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

EXPOSE 3003

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index-minimal.js"]
