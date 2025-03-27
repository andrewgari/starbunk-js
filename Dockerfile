# Build stage
FROM node:20-slim AS deps

WORKDIR /app

# Install minimal Python runtime
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y \
    python3-minimal \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install npm dependencies with caching
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Install minimal Python runtime and ffmpeg
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y \
    python3-minimal \
    python3-pip \
    python3-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Copy only necessary files
COPY scripts/requirements.txt scripts/
RUN . /app/venv/bin/activate && \
    pip install --no-cache-dir -r scripts/requirements.txt

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Install production dependencies with caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --production

# Environment variables
ENV NODE_ENV="production"

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Run the bot
CMD ["node", "--enable-source-maps", "dist/bunkbot.js"]
