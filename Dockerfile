# Stage 1: Install dependencies and build (builder stage)
FROM node:20-slim AS builder

WORKDIR /app

# Copy package.json and lockfiles first to leverage caching
COPY package*.json ./
COPY src/starbunk/bots/reply-bots/package*.json ./src/starbunk/bots/reply-bots/

# Install dependencies and global tools needed for build
RUN npm ci && \
    npm install -g typescript@latest ts-node tsc-alias && \
    cd src/starbunk/bots/reply-bots && npm ci

# Copy the rest of the source code
COPY . .

# Build the TypeScript project
# First build reply-bots, then run type checks from root
RUN cd src/starbunk/bots/reply-bots && npm run build && \
    cd ../../../.. && \
    npm run type-check:relaxed && \
    npx tsc -p tsconfig-check.json && \
    npx tsc-alias

# Stage 2: Runtime image
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd -r bunkbot && useradd -r -g bunkbot bunkbot

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    npm install -g ts-node typescript ts-node-dev prisma && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/prisma ./prisma

# Create directories and set permissions
RUN mkdir -p /app/data /app/data/campaigns /app/data/llm_context && \
    chown -R bunkbot:bunkbot /app && \
    chmod -R 755 /app && \
    chmod 777 /app/data && \
    chmod 777 /app/node_modules/@prisma && \
    touch /app/data/starbunk.db && \
    chown bunkbot:bunkbot /app/data/starbunk.db && \
    chmod 666 /app/data/starbunk.db

USER bunkbot

# Generate Prisma client and run migrations
RUN npx prisma generate && \
    npx prisma migrate deploy

CMD ["npm", "run", "dev"]
