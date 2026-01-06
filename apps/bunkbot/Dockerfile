# BunkBot Container - Reply bots and admin commands
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything with proper separation of concerns
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl ffmpeg curl dumb-init

# Copy package files for better caching
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bunkbot/package.json ./apps/bunkbot/

# Install all dependencies using workspace (more efficient than separate installs)
# Using cache mount to speed up npm install across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --ignore-scripts

# Copy shared package source
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig*.json ./packages/shared/

# Build shared package
RUN cd packages/shared && npm run build

# Copy app source code
COPY apps/bunkbot/src ./apps/bunkbot/src
COPY apps/bunkbot/tests ./apps/bunkbot/tests
COPY apps/bunkbot/jest.config.js apps/bunkbot/tsconfig*.json apps/bunkbot/.dockerignore ./apps/bunkbot/
COPY apps/bunkbot/scripts ./apps/bunkbot/scripts

# Build the application
RUN cd apps/bunkbot && npm run build:docker

# Clean up development dependencies
RUN npm prune --omit=dev

# Stage 2: Runtime - Minimal production image
FROM node:20-alpine AS runtime

# Build-time arguments for non-secret environment variables
# These can be overridden at runtime via .env file or docker-compose
ARG DEBUG_MODE=false
ARG NODE_ENV=production
ARG LOG_LEVEL=info
ARG LOG_FORMAT=json
ARG ENABLE_METRICS=true
ARG ENABLE_STRUCTURED_LOGGING=true
ARG ENABLE_RUNTIME_METRICS=true
ARG METRICS_PUSH_INTERVAL=30000
ARG METRICS_PORT=3000
ARG HEALTH_PORT=3000

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S bunkbot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bunkbot bunkbot

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=bunkbot:bunkbot /app/node_modules ./node_modules
COPY --from=builder --chown=bunkbot:bunkbot /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=bunkbot:bunkbot /app/apps/bunkbot/dist ./apps/bunkbot/dist
COPY --from=builder --chown=bunkbot:bunkbot /app/package.json ./
COPY --from=builder --chown=bunkbot:bunkbot /app/apps/bunkbot/package.json ./apps/bunkbot/

# Set default environment variables from build args
# These can be overridden at runtime via .env file or docker-compose environment
ENV DEBUG_MODE=${DEBUG_MODE} \
    NODE_ENV=${NODE_ENV} \
    LOG_LEVEL=${LOG_LEVEL} \
    LOG_FORMAT=${LOG_FORMAT} \
    ENABLE_METRICS=${ENABLE_METRICS} \
    ENABLE_STRUCTURED_LOGGING=${ENABLE_STRUCTURED_LOGGING} \
    ENABLE_RUNTIME_METRICS=${ENABLE_RUNTIME_METRICS} \
    METRICS_PUSH_INTERVAL=${METRICS_PUSH_INTERVAL} \
    METRICS_PORT=${METRICS_PORT} \
    HEALTH_PORT=${HEALTH_PORT}

# Switch to non-root user
USER bunkbot

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="bunkbot"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check (prefers HEALTH_PORT, then METRICS_PORT, else defaults)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${HEALTH_PORT:-${METRICS_PORT:-3002}}"; curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1'

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/bunkbot/dist/index.js"]
