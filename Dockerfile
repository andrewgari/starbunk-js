FROM node:20-slim AS builder

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Install global dependencies
RUN npm install -g typescript tsc-alias

COPY package*.json ./
COPY src/starbunk/bots/strategy-bots/package*.json ./src/starbunk/bots/strategy-bots/
RUN npm ci
RUN cd src/starbunk/bots/strategy-bots && npm ci
COPY . .
RUN cd src/starbunk/bots/strategy-bots && npm run build
RUN npm run type-check:relaxed && tsc -p tsconfig-check.json && tsc-alias

FROM node:20-slim AS runtime

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Create non-root user
RUN groupadd -r bunkbot && useradd -r -g bunkbot bunkbot

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    npm install -g ts-node typescript ts-node-dev prisma && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
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

# Generate Prisma client as bunkbot user
RUN npx prisma generate && \
    npx prisma migrate deploy

CMD ["npm", "run", "dev"]
