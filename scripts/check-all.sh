#!/bin/bash
set -e

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables
TEMP_LOG_FILE="/tmp/starbunk-check-all-$$.log"
RESULTS_FILE="/tmp/starbunk-check-results-$$.log"
FAILED_CHECKS=0
TOTAL_CHECKS=0
START_TIME=$(date +%s)

# Check if this is a demo run
DEMO_MODE=false
if [ "$1" == "--demo" ]; then
  DEMO_MODE=true
  echo -e "${YELLOW}Running in DEMO mode - only performing quick checks${NC}\n"
fi

# Print header
function print_header {
  echo -e "\n${BLUE}======================================================${NC}"
  echo -e "${BLUE}= ${YELLOW}Starbunk-JS Comprehensive Check${BLUE}                 =${NC}"
  echo -e "${BLUE}======================================================${NC}\n"
  echo -e "Starting checks at $(date)\n"
}

# Print section header
function print_section {
  echo -e "\n${CYAN}▶ $1${NC}"
  echo -e "${CYAN}$(printf '=%.0s' $(seq 1 50))${NC}\n"
}

# Run a check and record the result
function run_check {
  local name=$1
  local command=$2
  local timeout=${3:-60} # Default timeout of 60 seconds

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -e "${YELLOW}Running: ${name}${NC}"
  echo -e "${BLUE}Command: ${command}${NC}\n"

  # Create a temporary file for output
  rm -f "$TEMP_LOG_FILE"
  touch "$TEMP_LOG_FILE"

  # Run the command with timeout
  timeout $timeout bash -c "$command" > "$TEMP_LOG_FILE" 2>&1
  local exit_code=$?

  # Check the result
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED:${NC} ${name}"
    echo "PASSED: $name" >> "$RESULTS_FILE"
  elif [ $exit_code -eq 124 ]; then
    echo -e "${RED}✗ FAILED:${NC} ${name} (TIMEOUT after ${timeout}s)"
    echo "FAILED: $name (TIMEOUT)" >> "$RESULTS_FILE"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    echo -e "${RED}✗ FAILED:${NC} ${name} (Exit code: $exit_code)"
    echo "FAILED: $name (Exit code: $exit_code)" >> "$RESULTS_FILE"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Show the output
  echo -e "\n${BLUE}Output:${NC}"
  cat "$TEMP_LOG_FILE"
  echo -e "\n${BLUE}$(printf '=%.0s' $(seq 1 50))${NC}\n"
}

# Check if Docker is installed
function check_docker_installed {
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️ Docker is not installed or not in PATH. Skipping Docker checks.${NC}"
    return 1
  fi
  return 0
}

# Print summary
function print_summary {
  local end_time=$(date +%s)
  local duration=$((end_time - START_TIME))
  local minutes=$((duration / 60))
  local seconds=$((duration % 60))

  echo -e "\n${BLUE}======================================================${NC}"
  echo -e "${BLUE}= ${YELLOW}Check Summary${BLUE}                                   =${NC}"
  echo -e "${BLUE}======================================================${NC}\n"

  echo -e "Total checks: ${TOTAL_CHECKS}"
  echo -e "Passed: ${GREEN}$((TOTAL_CHECKS - FAILED_CHECKS))${NC}"
  echo -e "Failed: ${RED}${FAILED_CHECKS}${NC}"
  echo -e "Duration: ${minutes}m ${seconds}s"
  echo -e "\n${BLUE}Detailed Results:${NC}"
  cat "$RESULTS_FILE"

  if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}All checks passed successfully!${NC}"
    exit 0
  else
    echo -e "\n${RED}Some checks failed. Please review the output above.${NC}"
    exit 1
  fi
}

# Cleanup on exit
function cleanup {
  # Kill any background processes
  jobs -p | xargs -r kill

  # Remove temporary files
  rm -f "$TEMP_LOG_FILE"
  rm -f "$RESULTS_FILE"
}

# Main function
function main {
  # Setup
  trap cleanup EXIT
  rm -f "$RESULTS_FILE"
  touch "$RESULTS_FILE"

  print_header

  # 1. Linting
  print_section "Linting"
  run_check "ESLint" "npm run lint"
  run_check "Type Check - Main" "npm run type-check:main"
  run_check "Type Check - Cypress" "npm run type-check:cypress"

  # If in demo mode, skip the rest of the checks
  if $DEMO_MODE; then
    echo -e "${YELLOW}Demo mode: Skipping remaining checks${NC}\n"
    print_summary
    return
  fi

  # 2. Building
  print_section "Building"
  run_check "TypeScript Build" "npm run build"

  # 3. Unit Tests
  print_section "Unit Tests"
  run_check "Jest Tests" "npm run test"
  run_check "Test Coverage" "npm run test:coverage"

  # 4. Start Check (just verify it starts without errors)
  print_section "Application Start Check"
  run_check "Start Application" "timeout 5 npm run start || [ $? -eq 124 ]" 10

  # 5. Docker Checks
  print_section "Docker Checks"
  if check_docker_installed; then
    run_check "Docker Build" "docker build -t starbunk-js:test . --no-cache" 300
    run_check "Docker Run" "docker run --rm starbunk-js:test node -e 'console.log(\"Docker container works!\")'" 30
  fi

  # 6. Cypress Tests
  print_section "Cypress Tests"
  run_check "Cypress Snowbunk Tests" "npm run cypress:run -- --spec 'cypress/e2e/snowbunk/*.cy.ts'" 300

  # Print summary
  print_summary
}

# Execute main function
main "$@"
