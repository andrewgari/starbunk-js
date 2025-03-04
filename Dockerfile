FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install dependencies in a single layer with production flags
# Use --ignore-scripts to bypass @distube/yt-dlp postinstall script that's failing
RUN npm install --production=false --ignore-scripts

# Build the application
RUN npm run build

# Copy source code after dependencies are installed
COPY . .

# Use non-global package installation
CMD ["npm", "start"]
