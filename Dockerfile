FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
COPY package-lock.json ./

# Install dependencies including dev dependencies (needed for build)
# Use --ignore-scripts to bypass @distube/yt-dlp postinstall script that's failing
RUN npm ci --ignore-scripts

# Copy source code before building
COPY . .

# Build the application with special handling for module paths
RUN npm run build 

# Add a healthcheck to help diagnose issues
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('fs').readdirSync('./dist').length ? process.exit(0) : process.exit(1)"

# Use non-global package installation
CMD ["node", "--enable-source-maps", "dist/bunkbot.js"]
