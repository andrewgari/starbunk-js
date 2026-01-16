# BlueBot Container - Blue detection and response bot
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl curl dumb-init

# Copy package files for bluebot only
COPY src/bluebot/package.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit --production=false

# Copy app source code
COPY src/bluebot/src ./src
COPY src/bluebot/tests ./tests
COPY src/bluebot/vitest.config.ts src/bluebot/tsconfig*.json src/bluebot/.dockerignore ./

# Build the application
RUN npm run build:docker

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
    addgroup -g 1001 -S bluebot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bluebot bluebot

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=bluebot:bluebot /app/node_modules ./node_modules
COPY --from=builder --chown=bluebot:bluebot /app/dist ./dist
COPY --from=builder --chown=bluebot:bluebot /app/package.json ./package.json

# Set default environment variables from build args
ENV NODE_ENV=${NODE_ENV} \
    LOG_LEVEL=${LOG_LEVEL} \
    LOG_FORMAT=${LOG_FORMAT} \
    DEBUG_MODE=${DEBUG_MODE} \
    ENABLE_METRICS=${ENABLE_METRICS} \
    ENABLE_STRUCTURED_LOGGING=${ENABLE_STRUCTURED_LOGGING} \
    ENABLE_RUNTIME_METRICS=${ENABLE_RUNTIME_METRICS} \
    METRICS_PUSH_INTERVAL=${METRICS_PUSH_INTERVAL} \
    METRICS_PORT=${METRICS_PORT} \
    HEALTH_PORT=${HEALTH_PORT}

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
CMD ["node", "dist/index.js"]
