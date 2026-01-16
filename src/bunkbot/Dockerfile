# BunkBot Container - Next generation YAML-based reply bot system
# Optimized 2-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Builder - Build the application
FROM node:20-alpine3.20 AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl dumb-init

# Copy package files for better caching
COPY src/bunkbot/package.json src/bunkbot/package-lock.json* ./

# Install dependencies using cache mount to speed up builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY src/bunkbot/src ./src
COPY src/bunkbot/tsconfig*.json ./

# Build the application
RUN npm run build:docker

# Stage 2: Runtime - Minimal production image
FROM node:20-alpine AS runtime

# Build-time arguments for non-secret environment variables
ARG NODE_ENV=production
ARG LOG_LEVEL=info
ARG DEBUG_MODE=false
ARG ENABLE_METRICS=true
ARG ENABLE_STRUCTURED_LOGGING=true
ARG METRICS_PORT=3000

WORKDIR /app

# Create user and install runtime dependencies in one layer
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S bunkbot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G bunkbot bunkbot

# Copy only production dependencies and built artifacts from builder
COPY --from=builder --chown=bunkbot:bunkbot /app/node_modules ./node_modules
COPY --from=builder --chown=bunkbot:bunkbot /app/dist ./dist
COPY --from=builder --chown=bunkbot:bunkbot /app/package.json ./

# Set default environment variables from build args
ENV NODE_ENV=${NODE_ENV} \
    LOG_LEVEL=${LOG_LEVEL} \
    DEBUG_MODE=${DEBUG_MODE} \
    ENABLE_METRICS=${ENABLE_METRICS} \
    ENABLE_STRUCTURED_LOGGING=${ENABLE_STRUCTURED_LOGGING} \
    METRICS_PORT=${METRICS_PORT}

# Switch to non-root user
USER bunkbot

# Monitoring labels for Grafana/Prometheus discovery
LABEL com.starbunk.service="bunkbot"
LABEL com.starbunk.description="Next generation YAML-based reply bot system"
LABEL prometheus.io/scrape="true"
LABEL prometheus.io/path="/metrics"
LABEL prometheus.io/port="3000"

# Health check using HTTP endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c 'PORT="${METRICS_PORT:-3000}"; curl -fsS "http://127.0.0.1:${PORT}/live" || exit 1'

# Expose metrics port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

