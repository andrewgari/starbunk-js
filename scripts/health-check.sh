#!/bin/bash

# Starbunk Production Health Check Script
# This script checks the health of all services in the Docker Compose stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
SERVICES=("postgres" "bunkbot" "djcova" "starbunk-dnd" "covabot")
HEALTH_ENDPOINTS=(
    "postgres:5432"
    "localhost:3000/health"
    "localhost:3001/health"
    "localhost:3002/health"
    "localhost:3003/health"
)

echo -e "${BLUE}🏥 Starbunk Health Check${NC}"
echo "=================================="

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found${NC}"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking service status...${NC}"

# Check Docker Compose service status
for service in "${SERVICES[@]}"; do
    status=$(docker-compose ps -q "$service" 2>/dev/null)
    if [ -z "$status" ]; then
        echo -e "${RED}❌ $service: Not running${NC}"
        continue
    fi
    
    # Check if container is actually running
    container_status=$(docker inspect --format='{{.State.Status}}' "$status" 2>/dev/null)
    if [ "$container_status" = "running" ]; then
        echo -e "${GREEN}✅ $service: Running${NC}"
    else
        echo -e "${RED}❌ $service: $container_status${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔍 Checking health endpoints...${NC}"

# Function to check HTTP endpoint
check_http_endpoint() {
    local endpoint=$1
    local service_name=$2
    
    if command -v curl &> /dev/null; then
        if curl -f -s --max-time 10 "http://$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name: Health endpoint responding${NC}"
            return 0
        else
            echo -e "${RED}❌ $service_name: Health endpoint not responding${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  $service_name: curl not available, skipping HTTP check${NC}"
        return 0
    fi
}

# Function to check PostgreSQL
check_postgres() {
    local container_name="starbunk-postgres"
    
    if docker exec "$container_name" pg_isready -U starbunk -d starbunk > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL: Database ready${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL: Database not ready${NC}"
        return 1
    fi
}

# Check PostgreSQL
check_postgres

# Check HTTP endpoints for bot services
check_http_endpoint "localhost:3000/health" "BunkBot"
check_http_endpoint "localhost:3001/health" "DJCova"
check_http_endpoint "localhost:3002/health" "Starbunk-DND"
check_http_endpoint "localhost:3003/health" "CovaBot"

echo ""
echo -e "${BLUE}📊 Resource usage:${NC}"

# Show resource usage if docker stats is available
if command -v docker &> /dev/null; then
    echo "Container resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep starbunk || echo "No containers found with 'starbunk' prefix"
fi

echo ""
echo -e "${BLUE}📝 Recent logs (last 10 lines per service):${NC}"

# Show recent logs for each service
for service in "${SERVICES[@]}"; do
    echo -e "${YELLOW}--- $service ---${NC}"
    docker-compose logs --tail=3 "$service" 2>/dev/null || echo "No logs available for $service"
    echo ""
done

echo -e "${BLUE}🏁 Health check complete${NC}"
echo ""
echo -e "${BLUE}💡 Useful commands:${NC}"
echo "  View all logs:     docker-compose logs -f"
echo "  Restart services:  docker-compose restart"
echo "  Update images:     docker-compose pull && docker-compose up -d"
echo "  Stop services:     docker-compose down"
