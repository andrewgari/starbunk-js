# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Use npm ci with cache mount for faster installation
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Copy only necessary files for build
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    tzdata \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Set proper ownership for the application directory
RUN chown -R node:node /app

# Use non-root user for security
USER node

# Start the application
CMD ["node", "dist/bunkbot.js"]
