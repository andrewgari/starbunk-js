# BlueBot Container - Blue detection and response bot
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl curl dumb-init

# Copy package files for better caching (skip package-lock.json due to Alpine compatibility issues)
COPY packages/shared/package.json ./shared/
COPY prisma ./prisma
COPY apps/bluebot/package.json ./

# Install shared dependencies first
RUN cd shared && npm install

# Install container dependencies
RUN npm install

# Copy source code (skip package files that are already copied)
COPY packages/shared ./shared
COPY apps/bluebot/src ./src
COPY apps/bluebot/tests ./tests
COPY apps/bluebot/jest.config.js apps/bluebot/tsconfig*.json apps/bluebot/.dockerignore ./

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
ARG OPENAI_DEFAULT_MODEL=gpt-4o-mini

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S bluebot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bluebot bluebot

# Copy everything from builder stage (production-ready) with correct ownership
COPY --from=builder --chown=bluebot:bluebot /app/node_modules ./node_modules
COPY --from=builder --chown=bluebot:bluebot /app/shared ./shared
COPY --from=builder --chown=bluebot:bluebot /app/dist ./dist
COPY --from=builder --chown=bluebot:bluebot /app/package.json ./

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
    OPENAI_DEFAULT_MODEL=${OPENAI_DEFAULT_MODEL}

# Switch to non-root user
USER bluebot

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="bluebot"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check (prefers HEALTH_PORT, then METRICS_PORT, else defaults)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${HEALTH_PORT:-${METRICS_PORT:-3000}}"; curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1'

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index-minimal.js"]
