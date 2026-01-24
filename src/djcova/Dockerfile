# DJCova Container - Music service
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build everything in one stage for speed
FROM node:20-alpine AS builder

WORKDIR /app

# Install all system dependencies in one layer
RUN apk add --no-cache python3 make g++ openssl ffmpeg curl dumb-init

# Copy package files for better caching
COPY package.json package-lock.json* ./
COPY src/shared/package.json ./src/shared/
COPY src/djcova/package.json ./src/djcova/

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
COPY src/djcova/src ./src/djcova/src
COPY src/djcova/tests ./src/djcova/tests
COPY src/djcova/tsconfig*.json src/djcova/.dockerignore ./src/djcova/

# Build the application
RUN cd src/djcova && npm run build:docker

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

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache ffmpeg openssl dumb-init curl python3 py3-pip && \
    addgroup -g 1001 -S djcova && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G djcova djcova && \
    mkdir -p /tmp/djcova && \
    chown -R djcova:djcova /tmp/djcova && \
    pip3 install --no-cache-dir --break-system-packages "yt-dlp==2024.10.22"

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=djcova:djcova /app/node_modules ./node_modules
COPY --from=builder --chown=djcova:djcova /app/src/shared/node_modules ./src/shared/node_modules
COPY --from=builder --chown=djcova:djcova /app/src/shared/dist ./src/shared/dist
COPY --from=builder --chown=djcova:djcova /app/src/shared/package.json ./src/shared/
COPY --from=builder --chown=djcova:djcova /app/src/djcova/dist ./src/djcova/dist
COPY --from=builder --chown=djcova:djcova /app/package.json ./
COPY --from=builder --chown=djcova:djcova /app/src/djcova/package.json ./src/djcova/

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
    METRICS_PORT=${METRICS_PORT}

# Switch to non-root user
USER djcova

# Temp directory for yt-dlp/ffmpeg intermediates
ENV TMPDIR=/tmp/djcova

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="djcova"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check (prefers HEALTH_PORT, then METRICS_PORT, else defaults)
# Using /live endpoint for liveness check (simpler, doesn't fail on Discord connection issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${METRICS_PORT:-3000}"; curl -fsS "http://127.0.0.1:${PORT}/live" || exit 1'

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/djcova/dist/index.js"]
