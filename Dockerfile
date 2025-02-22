# Build stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# If you're running a production image
ENV NODE_ENV production
CMD ["npm", "start"]

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
