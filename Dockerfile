FROM node:20-alpine

WORKDIR /app

# Install system dependencies including Python and build tools
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    build-base \
    python3-dev

# Install Python dependencies
COPY scripts/requirements.txt ./scripts/
RUN pip3 install --no-cache-dir -r scripts/requirements.txt

# Copy package files first for better layer caching
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY process-env.d.ts ./

# Install dependencies including dev dependencies (needed for build)
# Use --ignore-scripts to bypass @distube/yt-dlp postinstall script that's failing
RUN npm ci --ignore-scripts

# Copy source code before building
COPY . .

# Clean and build the application
RUN npm run build:clean

# Verify the build was created
RUN ls -la dist && test -f dist/bunkbot.js

# Add a healthcheck to help diagnose issues
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD test -f dist/bunkbot.js && node -e "process.exit(0)" || process.exit(1)

# Command to run the application
CMD ["node", "--enable-source-maps", "dist/bunkbot.js"]
