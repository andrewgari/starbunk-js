FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Install dependencies in a single layer with production flags
RUN yarn install --frozen-lockfile --production=false

# Copy source code after dependencies are installed
COPY . .

# Use non-global package installation
CMD ["yarn", "start"]
