#!/bin/bash

# Docker Compose Configuration Test Script for Unraid Deployment
# Tests all three Docker Compose configurations with Unraid environment variables

set -e
cd "$(dirname "$0")"

echo "🐳 Testing Docker Compose Configurations for Unraid Deployment"
echo "=============================================================="

# Set up test environment variables
export UNRAID_APPDATA_PATH="/mnt/user/appdata/starbunk"
export POSTGRES_PASSWORD="test-password"
export STARBUNK_TOKEN="test-token"
export CLIENT_ID="test-client-id"
export GUILD_ID="test-guild-id"
export OPENAI_API_KEY="test-openai-key"
export COVABOT_API_KEY="test-covabot-key"

# Test configurations
COMPOSE_FILES=(
    "docker-compose.yml"
    "docker-compose.latest.yml"
    "docker-compose.snapshot.yml"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_compose_file() {
    local file=$1
    echo -e "\n${BLUE}📋 Testing: $file${NC}"
    echo "----------------------------------------"
    
    # Test 1: Validate syntax
    echo -n "  🔍 Syntax validation... "
    if docker-compose -f "$file" config > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "    Error: Invalid Docker Compose syntax"
        return 1
    fi
    
    # Test 2: Check for Unraid volume mounts
    echo -n "  📁 Unraid volume mounts... "
    config_output=$(docker-compose -f "$file" config 2>/dev/null)
    if echo "$config_output" | grep -q "UNRAID_APPDATA_PATH\|/mnt/user/appdata"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "    Error: No Unraid volume mounts found"
        return 1
    fi
    
    # Test 3: Check CovaBot service configuration
    echo -n "  🤖 CovaBot service config... "
    if echo "$config_output" | grep -q "covabot:"; then
        if echo "$config_output" | grep -A 20 "covabot:" | grep -q "COVABOT_DATA_DIR"; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${YELLOW}⚠️ WARN${NC}"
            echo "    Warning: COVABOT_DATA_DIR not found in CovaBot service"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "    Error: CovaBot service not found"
        return 1
    fi
    
    # Test 4: Check port exposure
    echo -n "  🌐 Port configuration... "
    if echo "$config_output" | grep -q "3001:3001"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${YELLOW}⚠️ WARN${NC}"
        echo "    Warning: CovaBot web interface port (3001) not exposed"
    fi
    
    # Test 5: Check environment variables
    echo -n "  🔧 Environment variables... "
    required_vars=("STARBUNK_TOKEN" "COVABOT_DATA_DIR" "USE_DATABASE")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! echo "$config_output" | grep -q "$var"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${YELLOW}⚠️ WARN${NC}"
        echo "    Warning: Missing environment variables: ${missing_vars[*]}"
    fi
    
    echo -e "  ${GREEN}✅ $file validation completed${NC}"
    return 0
}

# Test volume mount resolution
test_volume_mounts() {
    echo -e "\n${BLUE}📦 Testing Volume Mount Resolution${NC}"
    echo "----------------------------------------"
    
    for file in "${COMPOSE_FILES[@]}"; do
        echo -n "  📁 $file volume mounts... "
        
        # Get the resolved configuration
        config_output=$(docker-compose -f "$file" config 2>/dev/null)
        
        # Check if Unraid paths are properly resolved
        if echo "$config_output" | grep -q "/mnt/user/appdata/starbunk"; then
            echo -e "${GREEN}✅ PASS${NC}"
            
            # Show the actual mount paths
            echo "    CovaBot data mount:"
            echo "$config_output" | grep -A 5 -B 5 "covabot.*:/app/data" | grep -E "(source|target)" || true
        else
            echo -e "${RED}❌ FAIL${NC}"
            echo "    Error: Unraid paths not properly resolved"
        fi
    done
}

# Test environment variable substitution
test_env_substitution() {
    echo -e "\n${BLUE}🔧 Testing Environment Variable Substitution${NC}"
    echo "----------------------------------------"
    
    # Test with different UNRAID_APPDATA_PATH values
    test_paths=(
        "/mnt/user/appdata/starbunk"
        "/mnt/cache/appdata/starbunk"
        "./data"  # fallback
    )
    
    for test_path in "${test_paths[@]}"; do
        echo -n "  🔍 Testing path: $test_path... "
        
        export UNRAID_APPDATA_PATH="$test_path"
        config_output=$(docker-compose -f "docker-compose.yml" config 2>/dev/null)
        
        if echo "$config_output" | grep -q "$test_path"; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${RED}❌ FAIL${NC}"
            echo "    Error: Path substitution failed for $test_path"
        fi
    done
    
    # Restore original path
    export UNRAID_APPDATA_PATH="/mnt/user/appdata/starbunk"
}

# Test service dependencies
test_service_dependencies() {
    echo -e "\n${BLUE}🔗 Testing Service Dependencies${NC}"
    echo "----------------------------------------"
    
    for file in "${COMPOSE_FILES[@]}"; do
        echo -n "  🔍 $file dependencies... "
        
        config_output=$(docker-compose -f "$file" config 2>/dev/null)
        
        # Check if CovaBot depends on PostgreSQL when using database mode
        if echo "$config_output" | grep -A 10 "covabot:" | grep -q "depends_on"; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${YELLOW}⚠️ WARN${NC}"
            echo "    Warning: No service dependencies found for CovaBot"
        fi
    done
}

# Main test execution
main() {
    echo "Starting Docker Compose configuration tests..."
    echo "Test environment:"
    echo "  UNRAID_APPDATA_PATH: $UNRAID_APPDATA_PATH"
    echo "  Docker Compose version: $(docker-compose --version 2>/dev/null || echo 'Not available')"
    echo ""
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Error: docker-compose not found${NC}"
        echo "Please install Docker Compose to run these tests"
        exit 1
    fi
    
    # Test each compose file
    failed_tests=0
    for file in "${COMPOSE_FILES[@]}"; do
        if [ -f "$file" ]; then
            if ! test_compose_file "$file"; then
                ((failed_tests++))
            fi
        else
            echo -e "${RED}❌ Error: $file not found${NC}"
            ((failed_tests++))
        fi
    done
    
    # Run additional tests
    test_volume_mounts
    test_env_substitution
    test_service_dependencies
    
    # Summary
    echo -e "\n${BLUE}📊 Test Summary${NC}"
    echo "=============="
    
    total_files=${#COMPOSE_FILES[@]}
    passed_files=$((total_files - failed_tests))
    
    echo "  📋 Compose files tested: $total_files"
    echo "  ✅ Passed: $passed_files"
    echo "  ❌ Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All Docker Compose configurations are ready for Unraid deployment!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Copy your configuration to your Unraid server"
        echo "  2. Set UNRAID_APPDATA_PATH=/mnt/user/appdata/starbunk"
        echo "  3. Configure your .env file with actual values"
        echo "  4. Run: docker-compose up -d"
        echo "  5. Access CovaBot web interface at http://your-unraid-ip:3001"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Please review the issues above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
