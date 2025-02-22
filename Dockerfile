# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install ALL dependencies (including devDependencies)
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine

# Install production dependencies
RUN apk add --no-cache ffmpeg python3

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Add specific packages that need global installation
RUN yarn global add \
    ts-node \
    is-ci \
    distube

# Use non-root user for security
USER node

# Start the application
CMD ["node", "dist/bunkbot.js"]
