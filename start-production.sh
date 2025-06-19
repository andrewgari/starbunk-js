#!/bin/bash

# Starbunk Production Container Startup Script
# This script starts containers using pre-built images from GitHub Container Registry

set -e

echo "🚀 Starting Starbunk Production Containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.production.example"
    exit 1
fi

# Check for required environment variables
echo "🔍 Checking environment variables..."
source .env

required_vars=("STARBUNK_TOKEN" "CLIENT_ID" "GUILD_ID" "POSTGRES_PASSWORD")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo "Please add these to your .env file."
    exit 1
fi

echo "✅ Environment variables check passed"

# Authenticate with GitHub Container Registry if needed
echo "🔐 Checking GitHub Container Registry access..."
if ! docker pull ghcr.io/andrewgari/starbunk/bunkbot:latest > /dev/null 2>&1; then
    echo "⚠️  Cannot pull images from GHCR. You may need to:"
    echo "   1. Authenticate: docker login ghcr.io -u andrewgari"
    echo "   2. Ensure images exist in the registry"
    echo "   3. Check if images are public or you have access"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull latest images
echo "📥 Pulling latest images from GHCR..."
docker-compose pull

# Start PostgreSQL first
echo "📊 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker-compose exec postgres pg_isready -U starbunk -d starbunk > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        docker-compose logs postgres
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo ""
echo "✅ PostgreSQL is ready"

# Start all services
echo "🤖 Starting all bot services..."
docker-compose up -d

# Wait a moment for services to initialize
sleep 5

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🎉 Starbunk production containers are running!"
echo ""
echo "📋 Useful commands:"
echo "   View logs:           docker-compose logs -f [service_name]"
echo "   Stop all:            docker-compose down"
echo "   Restart service:     docker-compose restart [service_name]"
echo "   Update images:       docker-compose pull && docker-compose up -d"
echo "   View status:         docker-compose ps"
echo ""
echo "🔍 Service URLs (if health checks are enabled):"
echo "   BunkBot:     http://localhost:${BUNKBOT_PORT:-3000}/health"
echo "   DJCova:      http://localhost:${DJCOVA_PORT:-3001}/health"
echo "   Starbunk-DND: http://localhost:${STARBUNK_DND_PORT:-3002}/health"
echo "   CovaBot:     http://localhost:${COVABOT_PORT:-3003}/health"
