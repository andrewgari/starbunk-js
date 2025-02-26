# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

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
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    apk del python3 make g++

# Add specific packages that need global installation
RUN npm install -g \
    ts-node \
    is-ci \
    distube

# Set proper ownership for the application directory
RUN chown -R node:node /app

# Use non-root user for security
USER node

# Start the application
CMD ["node", "dist/bunkbot.js"]
