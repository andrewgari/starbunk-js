# CovaBot Container - AI personality bot
# Optimized multi-stage build with Alpine Linux (Docker & Podman compatible)

# Stage 1: Dependencies - Cache npm dependencies separately
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++ openssl

# Copy package files for dependency installation
COPY containers/shared/package*.json ./shared/
COPY containers/covabot/package*.json ./

# Install shared dependencies (optimized for both Docker and Podman)
RUN cd shared && npm ci --only=production && npm ci && npm cache clean --force

# Install container dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Builder - Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY containers/shared/package*.json ./shared/
COPY containers/covabot/package*.json ./

# Install all dependencies (including dev) - optimized for both Docker and Podman
RUN cd shared && npm ci && cd .. && npm ci && npm cache clean --force

# Copy source code
COPY containers/shared ./shared
COPY containers/covabot ./

# Build shared package and container
RUN cd shared && npm run build && npm pack && \
    cd .. && npm install ./shared/starbunk-shared-1.0.0.tgz && \
    npm run build

# Stage 3: Runtime - Minimal production image
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only runtime system dependencies
RUN apk add --no-cache openssl dumb-init curl && \
    addgroup -g 1001 -S covabot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G covabot covabot

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/shared/node_modules ./shared/node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package.json ./

# Set ownership and switch to non-root user
RUN chown -R covabot:covabot /app
USER covabot

# Create directories for persistent data
RUN mkdir -p /app/data /app/logs /app/public && \
    chown -R covabot:covabot /app/data /app/logs /app/public

# Environment variables for enhanced CovaBot
ENV NODE_ENV=production
ENV WEB_PORT=7080
ENV WEB_HOST=0.0.0.0

# Health check for enhanced CovaBot with web interface
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7080/health || exit 1

# Expose web interface port
EXPOSE 7080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start enhanced CovaBot (fallback to minimal if enhanced not available)
CMD ["sh", "-c", "if [ -f dist/index-enhanced.js ]; then node dist/index-enhanced.js; else node dist/index-minimal.js; fi"]
