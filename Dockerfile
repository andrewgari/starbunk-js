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

# Build the application
RUN npm run build

# Use non-global package installation
CMD ["npm", "start"]
