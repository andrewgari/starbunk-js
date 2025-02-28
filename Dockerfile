# Build stage
FROM node:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:alpine

# Install production dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    tzdata \
    ca-certificates
WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
# Keep the build dependencies since they might be needed at runtime
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && npm ci --only=production \
    && rm -rf /var/cache/apk/*

# Add specific packages that need global installation with pinned versions
RUN npm install -g \
    ts-node@10.9.2 \
    is-ci@3.0.1 \
    distube@5.0.6

# Set proper ownership for the application directory
RUN chown -R node:node /app

# Use non-root user for security
USER node

# Start the application
CMD ["node", "dist/bunkbot.js"]
