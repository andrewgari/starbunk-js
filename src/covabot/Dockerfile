# CovaBot Container - AI personality bot
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl curl dumb-init

# Copy package files for better caching
COPY package.json package-lock.json* ./
COPY src/shared/package.json ./src/shared/
COPY src/covabot/package.json ./src/covabot/

# Install all dependencies using workspace (more efficient)
# Using cache mount to speed up npm install across builds
# Note: --ignore-scripts skips prepare/postinstall scripts; they run later if needed
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --ignore-scripts

# Copy shared package source
COPY src/shared/src ./src/shared/src
COPY src/shared/tsconfig*.json ./src/shared/

# Build the shared package first
RUN cd src/shared && npm run build

# Copy app source code
COPY src/covabot/src ./src/covabot/src
COPY src/covabot/tests ./src/covabot/tests
COPY src/covabot/jest.config.js src/covabot/tsconfig*.json src/covabot/.dockerignore ./src/covabot/

# Build the application
RUN cd src/covabot && npm run build:docker

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
# Note: glibc-compat is needed for onnxruntime-node (used by @xenova/transformers)
RUN apk add --no-cache openssl dumb-init curl gcompat && \
    addgroup -g 1001 -S covabot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G covabot covabot

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=covabot:covabot /app/node_modules ./node_modules
COPY --from=builder --chown=covabot:covabot /app/src/shared/dist ./src/shared/dist
COPY --from=builder --chown=covabot:covabot /app/src/shared/package.json ./src/shared/
COPY --from=builder --chown=covabot:covabot /app/src/covabot/dist ./src/covabot/dist
COPY --from=builder --chown=covabot:covabot /app/package.json ./
COPY --from=builder --chown=covabot:covabot /app/src/covabot/package.json ./src/covabot/

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
# Using /live endpoint for liveness check (simpler, doesn't fail on Discord connection issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${HEALTH_PORT:-${METRICS_PORT:-3000}}"; curl -fsS "http://127.0.0.1:${PORT}/live" || exit 1'

EXPOSE 3003

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/covabot/dist/index.js"]
