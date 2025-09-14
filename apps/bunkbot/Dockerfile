# BunkBot Container - Reply bots and admin commands
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything with proper separation of concerns
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl ffmpeg curl dumb-init

# Copy package files for better caching
COPY packages/shared/package*.json packages/shared/package-lock.json ./shared/
COPY apps/bunkbot/package*.json apps/bunkbot/package-lock.json ./

# Install all dependencies in parallel for speed
RUN cd shared && npm ci && cd .. && npm ci

# Note: Prisma client is handled via shared package dependencies

# Copy source code
COPY packages/shared ./shared
COPY apps/bunkbot ./

# Build shared package first
RUN cd shared && npm run build

# Package and install shared package
RUN cd shared && SHARED_TGZ=$(npm pack | tail -n1) && \
    cd .. && npm install "./shared/${SHARED_TGZ}"

# Let's skip Prisma generation for now - it should be handled by the build process
# The shared package already includes Prisma client in its dependencies

# Build the container application
RUN npm run build:docker

# Clean up development dependencies
RUN npm prune --omit=dev

# Stage 2: Runtime - Minimal production image
FROM node:20-alpine AS runtime

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S bunkbot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bunkbot bunkbot

# Copy everything from builder stage (production-ready) with correct ownership
COPY --from=builder --chown=bunkbot:bunkbot /app/node_modules ./node_modules
COPY --from=builder --chown=bunkbot:bunkbot /app/shared ./shared
COPY --from=builder --chown=bunkbot:bunkbot /app/dist ./dist
COPY --from=builder --chown=bunkbot:bunkbot /app/package.json ./

# Switch to non-root user
USER bunkbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]