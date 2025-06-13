#!/bin/bash

# Migration script for Starbunk-JS modular architecture
set -e

echo "🚀 Starting migration to containerized architecture..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Backup current configuration
print_status "Creating backup of current configuration..."
if [ ! -d "backup" ]; then
    mkdir backup
fi

cp docker-compose.yml backup/docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp .env backup/.env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

print_success "Backup created in backup/ directory"

# Install container dependencies
print_status "Installing dependencies for all containers..."

# Shared dependencies
if [ -d "containers/shared" ]; then
    print_status "Installing shared dependencies..."
    cd containers/shared
    npm install
    cd ../..
    print_success "Shared dependencies installed"
fi

# Container dependencies
for container in bunkbot djcova starbunk-dnd covabot; do
    if [ -d "containers/$container" ]; then
        print_status "Installing dependencies for $container..."
        cd "containers/$container"
        npm install
        cd ../..
        print_success "$container dependencies installed"
    else
        print_warning "Container directory containers/$container not found"
    fi
done

# Build shared package
print_status "Building shared package..."
cd containers/shared
npm run build
cd ../..
print_success "Shared package built"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data/{music,campaigns,vectors,logs}
mkdir -p logs
print_success "Directories created"

# Update environment variables
print_status "Checking environment variables..."

if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env_sample" ]; then
        cp .env_sample .env
        print_warning "Please update .env file with your actual values"
    else
        print_error ".env_sample not found. Please create .env file manually"
    fi
fi

# Check required environment variables
required_vars=("STARBUNK_TOKEN" "DATABASE_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env 2>/dev/null; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_warning "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_warning "Please add these to your .env file"
fi

# Build containers
print_status "Building Docker containers..."
docker-compose -f docker-compose.new.yml build

if [ $? -eq 0 ]; then
    print_success "All containers built successfully"
else
    print_error "Failed to build containers"
    exit 1
fi

# Test container startup
print_status "Testing container startup..."
docker-compose -f docker-compose.new.yml up -d postgres

# Wait for postgres to be ready
print_status "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if postgres is healthy
if docker-compose -f docker-compose.new.yml ps postgres | grep -q "healthy"; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL may not be fully ready. Check logs if containers fail to start."
fi

# Stop test containers
docker-compose -f docker-compose.new.yml down

print_success "Migration preparation complete!"

echo ""
echo "📋 Next steps:"
echo "1. Review and update your .env file with correct values"
echo "2. Start the new containerized stack:"
echo "   docker-compose -f docker-compose.new.yml up -d"
echo "3. Monitor logs:"
echo "   docker-compose -f docker-compose.new.yml logs -f"
echo "4. For development:"
echo "   docker-compose -f docker-compose.dev.yml up -d"
echo ""
echo "📚 See ARCHITECTURE.md for detailed documentation"
echo ""
print_success "Migration script completed successfully!"
