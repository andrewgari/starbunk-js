# DJCova Container - Music service
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl ffmpeg curl dumb-init

# Copy package files for better caching
COPY packages/shared/package.json packages/shared/package-lock.json ./shared/
COPY apps/djcova/package.json apps/djcova/package-lock.json ./

# Install all dependencies in parallel for speed
RUN cd shared && ls -la && npm ci && cd .. && ls -la && npm ci

# Copy source code
COPY packages/shared ./shared
COPY apps/djcova ./

# Build shared package and container in one step
RUN cd shared && npm run build && SHARED_TGZ=$(npm pack | tail -n1) && \
    cd .. && npm install "./shared/${SHARED_TGZ}" && \
    npm run build:docker && \
    npm prune --omit=dev

# Stage 2: Runtime - Minimal production image
FROM node:20-alpine AS runtime

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache ffmpeg openssl dumb-init curl && \
    addgroup -g 1001 -S djcova && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G djcova djcova

# Copy everything from builder stage (production-ready) with correct ownership
COPY --from=builder --chown=djcova:djcova /app/node_modules ./node_modules
COPY --from=builder --chown=djcova:djcova /app/shared ./shared
COPY --from=builder --chown=djcova:djcova /app/dist ./dist
COPY --from=builder --chown=djcova:djcova /app/package.json ./

# Switch to non-root user
USER djcova

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
