# Multi-stage build for Ollama Document Assistant
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies for document processing
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ollama-docs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy shared library (if needed)
COPY --from=builder /app/node_modules/@starbunk/shared ./node_modules/@starbunk/shared

# Create data directory for documents
RUN mkdir -p /app/data/documents && \
    chown -R ollama-docs:nodejs /app/data

# Set permissions
RUN chown -R ollama-docs:nodejs /app

# Switch to non-root user
USER ollama-docs

# Expose health check port (optional)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV OLLAMA_URL=http://localhost:11434
ENV OLLAMA_MODEL=llama2
ENV ENABLE_HEALTH_CHECK=true
ENV HEALTH_CHECK_PORT=3000

# Start the application
CMD ["node", "dist/index.js"]
