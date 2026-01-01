# Starbunk D&D Container - D&D features service
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl ffmpeg curl dumb-init

# Copy package files for better caching (skip package-lock.json due to Alpine compatibility issues)
COPY packages/shared/package.json ./shared/
COPY apps/starbunk-dnd/package.json ./

# Install shared dependencies first
RUN cd shared && npm install

# Install container dependencies
RUN npm install

# Copy source code (skip package files that are already copied)
COPY packages/shared ./shared
COPY apps/starbunk-dnd/src ./src
COPY apps/starbunk-dnd/tests ./tests
COPY apps/starbunk-dnd/jest.config.js apps/starbunk-dnd/tsconfig*.json apps/starbunk-dnd/.dockerignore ./

# Build shared package and container in one step
RUN cd shared && npm run build && SHARED_TGZ=$(npm pack | tail -n1) && \
    cd .. && npm install "./shared/${SHARED_TGZ}" && \
    npm run build:docker && \
    npm prune --omit=dev

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
ARG OLLAMA_DEFAULT_MODEL=qwen2.5:7b
ARG OLLAMA_AUTO_PULL_MODELS=true
ARG OLLAMA_PULL_ON_STARTUP=true
ARG OLLAMA_PULL_TIMEOUT_MS=1200000

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S starbunk-dnd && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G starbunk-dnd starbunk-dnd

# Copy everything from builder stage (production-ready) with correct ownership
COPY --from=builder --chown=starbunk-dnd:starbunk-dnd /app/node_modules ./node_modules
COPY --from=builder --chown=starbunk-dnd:starbunk-dnd /app/shared ./shared
COPY --from=builder --chown=starbunk-dnd:starbunk-dnd /app/dist ./dist
COPY --from=builder --chown=starbunk-dnd:starbunk-dnd /app/package.json ./

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
    OLLAMA_PULL_TIMEOUT_MS=${OLLAMA_PULL_TIMEOUT_MS}

# Switch to non-root user
USER starbunk-dnd

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="starbunk-dnd"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check (prefers HEALTH_PORT, then METRICS_PORT, else defaults)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${HEALTH_PORT:-${METRICS_PORT:-3000}}"; curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1'

EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
