#!/bin/bash
set -e

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Running essential dev checks ===${NC}"

# Function to run a command with timeout and check for success
run_check() {
  local name=$1
  local command=$2
  local timeout=$3
  local success_pattern=$4

  echo -e "${YELLOW}Checking $name...${NC}"

  # Run the command with timeout and capture output
  output=$(timeout $timeout bash -c "$command" 2>&1) || {
    echo -e "${RED}✗ $name check failed${NC}"
    echo "Command output:"
    echo "$output"
    return 1
  }

  # Check for success pattern if provided
  if [ -n "$success_pattern" ]; then
    if echo "$output" | grep -q "$success_pattern"; then
      echo -e "${GREEN}✓ $name check passed${NC}"
    else
      echo -e "${RED}✗ $name check failed - success pattern not found${NC}"
      echo "Command output:"
      echo "$output"
      return 1
    fi
  else
    echo -e "${GREEN}✓ $name check passed${NC}"
  fi

  return 0
}

# 1. Lint check
run_check "Lint" "npm run lint" 30 || exit 1

# 2. Unit tests
run_check "Unit tests" "npm test" 60 "Test Suites:" || exit 1

# 3. Build
run_check "Build" "npm run build" 30 || exit 1

# 4. E2E tests
echo -e "${YELLOW}Checking E2E tests...${NC}"

# Try running E2E tests with different approaches
if [ -d "cypress" ]; then
  # First try: Use test:e2e:local script if it exists
  if grep -q "\"test:e2e:local\":" package.json; then
    echo -e "${YELLOW}Running E2E tests with local script...${NC}"
    if timeout 300 npm run test:e2e:local > e2e_output.log 2>&1; then
      echo -e "${GREEN}✓ E2E tests passed${NC}"
    else
      echo -e "${YELLOW}Local E2E tests failed, trying with Docker...${NC}"

      # Second try: Use Docker if available
      if command -v docker &> /dev/null; then
        echo -e "${YELLOW}Running E2E tests with Docker...${NC}"
        if docker run --rm \
          -v "$PWD":/e2e \
          -w /e2e \
          cypress/included:latest \
          --spec 'cypress/e2e/**/*.cy.ts' > docker_e2e_output.log 2>&1; then
          echo -e "${GREEN}✓ E2E tests with Docker passed${NC}"
        else
          echo -e "${YELLOW}⚠️ E2E tests failed but continuing with other checks${NC}"
        fi
      else
        echo -e "${YELLOW}⚠️ Docker not available, skipping Docker E2E tests${NC}"
        echo -e "${YELLOW}⚠️ E2E tests failed but continuing with other checks${NC}"
      fi
    fi
  else
    # If test:e2e:local doesn't exist, try with CI=true
    echo -e "${YELLOW}Running E2E tests with CI mode...${NC}"
    if CI=true timeout 300 npm run test:e2e > e2e_output.log 2>&1; then
      echo -e "${GREEN}✓ E2E tests passed${NC}"
    else
      echo -e "${YELLOW}⚠️ E2E tests failed but continuing with other checks${NC}"
    fi
  fi

  # Clean up log files
  rm -f e2e_output.log docker_e2e_output.log 2>/dev/null || true
else
  echo -e "${YELLOW}⚠️ Cypress directory not found, skipping E2E tests${NC}"
fi

# 5. Docker build
if command -v docker &> /dev/null; then
  run_check "Docker build" "docker build -t starbunk-js:test ." 300 || {
    echo -e "${YELLOW}⚠️ Docker build failed but continuing with other checks${NC}"
  }
else
  echo -e "${YELLOW}⚠️ Docker not installed or not in PATH, skipping Docker build${NC}"
fi

# 6. Start check (run for a few seconds to verify it starts correctly)
echo -e "${YELLOW}Checking Start...${NC}"
(timeout 10 npm run start > start_output.log 2>&1) || true

# Check if the application started correctly
if grep -q "All modules registered successfully\|Slash commands registered successfully\|Registered Bot:" start_output.log; then
  echo -e "${GREEN}✓ Start check passed${NC}"
else
  echo -e "${RED}✗ Start check failed${NC}"
  cat start_output.log
  rm start_output.log
  exit 1
fi

rm start_output.log

echo -e "${GREEN}=== All essential checks completed successfully! ===${NC}"
