#!/bin/bash

# CovaBot Staging Environment Setup Script
# Creates a safe testing environment that mirrors production

set -e

echo "🎭 CovaBot Staging Environment Setup"
echo "===================================="

# Configuration
STAGING_DIR="./staging"
STAGING_COMPOSE_FILE="docker-compose.staging.yml"
STAGING_ENV_FILE=".env.staging"
STAGING_PORT_OFFSET=1000  # Web interface will be on 8080 instead of 7080

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if podman is installed
    if ! command -v podman &> /dev/null; then
        log_error "Podman is not installed. Please install podman first."
        exit 1
    fi
    
    # Check if podman-compose is available
    if ! command -v podman-compose &> /dev/null; then
        log_warning "podman-compose not found. Trying docker-compose..."
        if ! command -v docker-compose &> /dev/null; then
            log_error "Neither podman-compose nor docker-compose found. Please install one."
            exit 1
        fi
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="podman-compose"
    fi
    
    log_success "Prerequisites check completed"
}

# Function to create staging directory structure
create_staging_structure() {
    log_info "Creating staging directory structure..."
    
    mkdir -p "$STAGING_DIR"
    mkdir -p "$STAGING_DIR/data/covabot"
    mkdir -p "$STAGING_DIR/logs"
    mkdir -p "$STAGING_DIR/backups"
    
    log_success "Staging directory structure created"
}

# Function to create staging environment file
create_staging_env() {
    log_info "Creating staging environment configuration..."
    
    cat > "$STAGING_ENV_FILE" << EOF
# CovaBot Staging Environment Configuration
# This file contains staging-specific settings

# Environment
NODE_ENV=staging
LOG_LEVEL=debug

# Discord Configuration (use test bot tokens)
STARBUNK_TOKEN=\${STARBUNK_STAGING_TOKEN}
CLIENT_ID=\${CLIENT_ID_STAGING}
GUILD_ID=\${GUILD_ID_STAGING}

# Debug Mode Configuration (CRITICAL: Always enabled in staging)
DEBUG_MODE=true
TESTING_SERVER_IDS=\${STAGING_SERVER_IDS}
TESTING_CHANNEL_IDS=\${STAGING_CHANNEL_IDS}

# Database Configuration
DATABASE_URL=postgresql://starbunk_staging:staging_password@postgres_staging:5432/starbunk_staging

# LLM Configuration
OPENAI_API_KEY=\${OPENAI_API_KEY}
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OLLAMA_API_URL=\${OLLAMA_API_URL:-http://host.containers.internal:11434}

# Qdrant Configuration
QDRANT_URL=http://192.168.50.3:6333
USE_QDRANT=true

# CovaBot Specific Configuration
USE_DATABASE=true
COVABOT_DATA_DIR=/app/data
COVABOT_API_KEY=staging-api-key-$(date +%s)
COVABOT_WEB_PORT=$((7080 + STAGING_PORT_OFFSET))

# Unraid Configuration
UNRAID_APPDATA_PATH=./staging/data

# Staging-specific settings
STAGING_MODE=true
ENABLE_DETAILED_LOGGING=true
PERFORMANCE_MONITORING=true
EOF

    log_success "Staging environment file created: $STAGING_ENV_FILE"
    log_warning "Please update the staging environment variables with your test values"
}

# Function to create staging docker-compose file
create_staging_compose() {
    log_info "Creating staging docker-compose configuration..."
    
    cat > "$STAGING_COMPOSE_FILE" << EOF
version: '3.8'

services:
  # PostgreSQL Database for Staging
  postgres_staging:
    image: postgres:15-alpine
    container_name: starbunk-postgres-staging
    restart: unless-stopped
    environment:
      POSTGRES_DB: starbunk_staging
      POSTGRES_USER: starbunk_staging
      POSTGRES_PASSWORD: staging_password
    volumes:
      - ./staging/data/postgres:/var/lib/postgresql/data
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U starbunk_staging"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - starbunk-staging-network

  # CovaBot Staging Container
  covabot_staging:
    image: ghcr.io/andrewgari/covabot:snapshot
    container_name: starbunk-covabot-staging
    restart: unless-stopped
    env_file:
      - .env.staging
    environment:
      - NODE_ENV=staging
      - STAGING_MODE=true
      - DATABASE_URL=postgresql://starbunk_staging:staging_password@postgres_staging:5432/starbunk_staging
    volumes:
      # Staging data directory
      - ./staging/data/covabot:/app/data
      # Staging logs
      - ./staging/logs:/app/logs
    ports:
      # Web interface on different port (8080 instead of 7080)
      - "8080:8080"
    depends_on:
      postgres_staging:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - starbunk-staging-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  starbunk-staging-network:
    driver: bridge

volumes:
  postgres_staging_data:
    driver: local
EOF

    log_success "Staging docker-compose file created: $STAGING_COMPOSE_FILE"
}

# Function to create staging test scripts
create_staging_tests() {
    log_info "Creating staging test scripts..."
    
    mkdir -p "$STAGING_DIR/tests"
    
    # Create staging validation script
    cat > "$STAGING_DIR/tests/validate-staging.sh" << 'EOF'
#!/bin/bash

# Staging Environment Validation Script

echo "🧪 Validating Staging Environment"
echo "================================"

# Test database connectivity
echo "Testing database connectivity..."
if podman exec starbunk-postgres-staging pg_isready -U starbunk_staging; then
    echo "✅ Database is ready"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test web interface
echo "Testing web interface..."
if curl -f http://localhost:8080/api/health; then
    echo "✅ Web interface is healthy"
else
    echo "❌ Web interface health check failed"
    exit 1
fi

# Test Qdrant connectivity
echo "Testing Qdrant connectivity..."
if curl -f http://192.168.50.3:6333/collections; then
    echo "✅ Qdrant is accessible"
else
    echo "❌ Qdrant connection failed"
    exit 1
fi

echo "🎉 Staging environment validation completed successfully!"
EOF

    chmod +x "$STAGING_DIR/tests/validate-staging.sh"
    
    # Create load testing script
    cat > "$STAGING_DIR/tests/load-test.sh" << 'EOF'
#!/bin/bash

# Basic Load Testing for CovaBot Staging

echo "⚡ Running Load Tests on Staging Environment"
echo "==========================================="

# Test web interface load
echo "Testing web interface load..."
for i in {1..10}; do
    curl -s http://localhost:8080/api/health > /dev/null &
done
wait

echo "✅ Web interface load test completed"

# Test memory usage
echo "Checking memory usage..."
podman stats --no-stream starbunk-covabot-staging

echo "🎉 Load testing completed!"
EOF

    chmod +x "$STAGING_DIR/tests/load-test.sh"
    
    log_success "Staging test scripts created"
}

# Function to create monitoring setup
create_monitoring_setup() {
    log_info "Creating monitoring setup..."
    
    mkdir -p "$STAGING_DIR/monitoring"
    
    # Create monitoring script
    cat > "$STAGING_DIR/monitoring/monitor.sh" << 'EOF'
#!/bin/bash

# CovaBot Staging Monitoring Script

echo "📊 CovaBot Staging Monitoring Dashboard"
echo "======================================"

while true; do
    clear
    echo "📊 CovaBot Staging Monitoring Dashboard"
    echo "======================================"
    echo "Timestamp: $(date)"
    echo ""
    
    # Container status
    echo "🐳 Container Status:"
    podman ps --filter name=starbunk-covabot-staging --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Resource usage
    echo "💾 Resource Usage:"
    podman stats --no-stream starbunk-covabot-staging --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    echo ""
    
    # Health checks
    echo "🏥 Health Status:"
    if curl -s http://localhost:8080/api/health > /dev/null; then
        echo "✅ Web Interface: Healthy"
    else
        echo "❌ Web Interface: Unhealthy"
    fi
    
    if curl -s http://192.168.50.3:6333/collections > /dev/null; then
        echo "✅ Qdrant: Connected"
    else
        echo "❌ Qdrant: Disconnected"
    fi
    
    echo ""
    echo "Press Ctrl+C to exit monitoring"
    sleep 10
done
EOF

    chmod +x "$STAGING_DIR/monitoring/monitor.sh"
    
    log_success "Monitoring setup created"
}

# Function to create deployment scripts
create_deployment_scripts() {
    log_info "Creating deployment scripts..."
    
    # Start staging script
    cat > "start-staging.sh" << EOF
#!/bin/bash

echo "🚀 Starting CovaBot Staging Environment"
echo "======================================"

# Check if staging environment file exists
if [ ! -f "$STAGING_ENV_FILE" ]; then
    echo "❌ Staging environment file not found: $STAGING_ENV_FILE"
    echo "Please run setup-staging-environment.sh first"
    exit 1
fi

# Start staging environment
$COMPOSE_CMD -f $STAGING_COMPOSE_FILE up -d

echo "✅ Staging environment started"
echo "🌐 Web interface available at: http://localhost:8080"
echo "📊 Monitor with: ./staging/monitoring/monitor.sh"
echo "🧪 Validate with: ./staging/tests/validate-staging.sh"
EOF

    chmod +x "start-staging.sh"
    
    # Stop staging script
    cat > "stop-staging.sh" << EOF
#!/bin/bash

echo "🛑 Stopping CovaBot Staging Environment"
echo "====================================="

$COMPOSE_CMD -f $STAGING_COMPOSE_FILE down

echo "✅ Staging environment stopped"
EOF

    chmod +x "stop-staging.sh"
    
    log_success "Deployment scripts created"
}

# Function to create backup and rollback scripts
create_backup_rollback() {
    log_info "Creating backup and rollback scripts..."
    
    cat > "backup-staging.sh" << 'EOF'
#!/bin/bash

# CovaBot Staging Backup Script

BACKUP_DIR="./staging/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="covabot_staging_backup_$TIMESTAMP"

echo "💾 Creating staging backup: $BACKUP_NAME"

mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup database
echo "Backing up database..."
podman exec starbunk-postgres-staging pg_dump -U starbunk_staging starbunk_staging > "$BACKUP_DIR/$BACKUP_NAME/database.sql"

# Backup data directory
echo "Backing up data directory..."
cp -r ./staging/data "$BACKUP_DIR/$BACKUP_NAME/"

# Backup configuration
echo "Backing up configuration..."
cp .env.staging "$BACKUP_DIR/$BACKUP_NAME/"
cp docker-compose.staging.yml "$BACKUP_DIR/$BACKUP_NAME/"

# Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOL
Backup Created: $(date)
CovaBot Version: $(podman inspect starbunk-covabot-staging --format '{{.Config.Image}}')
Database: PostgreSQL
Qdrant URL: http://192.168.50.3:6333
EOL

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME"
EOF

    chmod +x "backup-staging.sh"
    
    log_success "Backup and rollback scripts created"
}

# Main execution
main() {
    echo ""
    log_info "Starting CovaBot staging environment setup..."
    
    check_prerequisites
    create_staging_structure
    create_staging_env
    create_staging_compose
    create_staging_tests
    create_monitoring_setup
    create_deployment_scripts
    create_backup_rollback
    
    echo ""
    log_success "🎉 Staging environment setup completed!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Edit $STAGING_ENV_FILE with your staging configuration"
    echo "2. Run: ./start-staging.sh"
    echo "3. Validate: ./staging/tests/validate-staging.sh"
    echo "4. Monitor: ./staging/monitoring/monitor.sh"
    echo ""
    echo "🌐 Staging web interface will be available at: http://localhost:8080"
    echo "📊 Database will be available at: localhost:5433"
    echo ""
}

main "$@"
