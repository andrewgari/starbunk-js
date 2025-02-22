# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

# Install production dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Add specific packages that need global installation
RUN npm install -g \
    ts-node \
    is-ci \
    distube

# Use non-root user for security
USER node

# Start the application
CMD ["node", "dist/bunkbot.js"]
