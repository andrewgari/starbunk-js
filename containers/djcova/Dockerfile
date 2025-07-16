# DJCova Container - Music service
# Optimized multi-stage build with Alpine Linux and BuildKit caching

# Stage 1: Dependencies - Cache npm dependencies separately
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++ openssl

# Copy package files for dependency installation
COPY containers/shared/package*.json ./shared/
COPY containers/djcova/package*.json ./

# Install shared dependencies with mount cache
RUN --mount=type=cache,target=/root/.npm \
    cd shared && npm ci --only=production && npm ci

# Install container dependencies with mount cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Stage 2: Builder - Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY containers/shared/package*.json ./shared/
COPY containers/djcova/package*.json ./

# Install all dependencies (including dev) with mount cache
RUN --mount=type=cache,target=/root/.npm \
    cd shared && npm ci && cd .. && npm ci

# Copy source code
COPY containers/shared ./shared
COPY containers/djcova ./

# Build shared package and container
RUN cd shared && npm run build && npm pack && \
    cd .. && npm install ./shared/starbunk-shared-1.0.0.tgz && \
    npm run build

# Stage 3: Runtime - Minimal production image
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime system dependencies (including ffmpeg for audio processing)
RUN apk add --no-cache ffmpeg openssl python3 dumb-init curl && \
    addgroup -g 1001 -S djcova && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G djcova djcova

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/shared/node_modules ./shared/node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package.json ./

# Set ownership and switch to non-root user
RUN chown -R djcova:djcova /app
USER djcova

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
