#!/bin/bash

# Starbunk Container Startup Script
# This script helps you start the Starbunk containers with proper configuration

set -e

echo "🚀 Starting Starbunk Containers..."

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

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull and start containers
echo "📥 Pulling latest images from GitHub Container Registry..."
echo "This may take a few minutes on first run..."

# Pull all images first to check if they exist
echo "🔍 Checking image availability..."
images=(
    "ghcr.io/andrewgari/starbunk/bunkbot:latest"
    "ghcr.io/andrewgari/starbunk/djcova:latest"
    "ghcr.io/andrewgari/starbunk/starbunk-dnd:latest"
    "ghcr.io/andrewgari/starbunk/covabot:latest"
)

for image in "${images[@]}"; do
    echo "  Pulling $image..."
    if ! docker pull "$image" 2>/dev/null; then
        echo "⚠️  Warning: Could not pull $image"
        echo "    This image may not exist in the registry yet."
        echo "    You may need to build and publish it first via CI/CD."
    else
        echo "  ✅ Successfully pulled $image"
    fi
done

# Start with just PostgreSQL first
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

# Start all other services
echo "🤖 Starting bot services..."
docker-compose up -d

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🎉 Starbunk containers are starting up!"
echo ""
echo "📋 Useful commands:"
echo "   View logs:           docker-compose logs -f [service_name]"
echo "   Stop all:            docker-compose down"
echo "   Restart service:     docker-compose restart [service_name]"
echo "   View status:         docker-compose ps"
echo ""
echo "🔍 Check container health:"
echo "   docker-compose ps"
echo ""
echo "📝 If you see 'manifest unknown' errors, the Docker images don't exist in GHCR yet."
echo "   You need to build and publish them via GitHub Actions CI/CD first."
echo ""
echo "🔧 To build and publish images:"
echo "   1. Push code to GitHub to trigger CI/CD"
echo "   2. Or manually trigger the 'Docker Build' workflow"
echo "   3. Wait for images to be published to GHCR"
echo ""
echo "🔄 For local development, use: docker-compose -f docker-compose.dev.yml up"
