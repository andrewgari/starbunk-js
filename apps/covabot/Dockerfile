# CovaBot Container - AI personality bot
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl curl dumb-init

# Copy package files for better caching
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/covabot/package.json ./apps/covabot/

# Install all dependencies using workspace (more efficient)
# Using cache mount to speed up npm install across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --ignore-scripts

# Copy shared package source
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig*.json ./packages/shared/

# Build shared package
RUN cd packages/shared && npm run build

# Copy app source code
COPY apps/covabot/src ./apps/covabot/src
COPY apps/covabot/tests ./apps/covabot/tests
COPY apps/covabot/jest.config.js apps/covabot/tsconfig*.json apps/covabot/.dockerignore ./apps/covabot/

# Build the application
RUN cd apps/covabot && npm run build:docker

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
ARG OLLAMA_DEFAULT_MODEL=mistral:latest
ARG OLLAMA_AUTO_PULL_MODELS=true
ARG OLLAMA_PULL_ON_STARTUP=true
ARG OLLAMA_PULL_TIMEOUT_MS=1200000
ARG USE_DATABASE=false

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S covabot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G covabot covabot

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=covabot:covabot /app/node_modules ./node_modules
COPY --from=builder --chown=covabot:covabot /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=covabot:covabot /app/apps/covabot/dist ./apps/covabot/dist
COPY --from=builder --chown=covabot:covabot /app/package.json ./
COPY --from=builder --chown=covabot:covabot /app/apps/covabot/package.json ./apps/covabot/

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
    HEALTH_PORT=${HEALTH_PORT} \
    OLLAMA_DEFAULT_MODEL=${OLLAMA_DEFAULT_MODEL} \
    OLLAMA_AUTO_PULL_MODELS=${OLLAMA_AUTO_PULL_MODELS} \
    OLLAMA_PULL_ON_STARTUP=${OLLAMA_PULL_ON_STARTUP} \
    OLLAMA_PULL_TIMEOUT_MS=${OLLAMA_PULL_TIMEOUT_MS} \
    USE_DATABASE=${USE_DATABASE}

# Switch to non-root user
USER covabot

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="covabot"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check (prefers HEALTH_PORT, then METRICS_PORT, else defaults)
# Using /ready endpoint instead of /health to avoid false positives from memory thresholds
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${HEALTH_PORT:-${METRICS_PORT:-3000}}"; curl -fsS "http://127.0.0.1:${PORT}/ready" || exit 1'

EXPOSE 3003

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/covabot/dist/index-minimal.js"]
