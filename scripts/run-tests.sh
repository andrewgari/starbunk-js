#!/bin/bash
set -e

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage information
function print_usage {
  echo -e "${BLUE}Usage:${NC} $0 [command]"
  echo ""
  echo "Commands:"
  echo "  lint             - Run ESLint on the codebase"
  echo "  test             - Run Jest unit tests"
  echo "  build            - Build the TypeScript project"
  echo "  start            - Start the application"
  echo "  cypress          - Run Cypress tests"
  echo "  cypress:open     - Open Cypress test runner"
  echo "  cypress:snowbunk - Run Snowbunk-specific Cypress tests"
  echo "  docker:build     - Build Docker image"
  echo "  docker:test      - Run tests in Docker container"
  echo "  docker:cypress   - Run Cypress tests in Docker container"
  echo "  docker:start     - Start application in Docker container"
  echo "  all              - Run lint, test, build, and cypress tests"
  echo "  ci               - Run all tests in CI mode (non-interactive)"
  echo ""
}

# Check if Docker is installed
function check_docker {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
  fi
}

# Run ESLint
function run_lint {
  echo -e "${YELLOW}Running ESLint...${NC}"
  npm run lint
}

# Run Jest tests
function run_test {
  echo -e "${YELLOW}Running Jest tests...${NC}"
  npm run test
}

# Build the project
function run_build {
  echo -e "${YELLOW}Building project...${NC}"
  npm run build
}

# Start the application
function run_start {
  echo -e "${YELLOW}Starting application...${NC}"
  npm run start
}

# Run Cypress tests
function run_cypress {
  echo -e "${YELLOW}Running Cypress tests...${NC}"
  npm run cypress:run
}

# Open Cypress test runner
function run_cypress_open {
  echo -e "${YELLOW}Opening Cypress test runner...${NC}"
  npm run cypress:open
}

# Run Snowbunk-specific Cypress tests
function run_cypress_snowbunk {
  echo -e "${YELLOW}Running Snowbunk Cypress tests...${NC}"
  npm run cypress:run -- --spec "cypress/e2e/snowbunk/*.cy.ts"
}

# Build Docker image
function run_docker_build {
  echo -e "${YELLOW}Building Docker image...${NC}"
  check_docker
  docker build -t starbunk-js:latest .
}

# Run tests in Docker
function run_docker_test {
  echo -e "${YELLOW}Running tests in Docker...${NC}"
  check_docker
  docker run --rm -v "$(pwd)":/app starbunk-js:latest npm test
}

# Run Cypress tests in Docker
function run_docker_cypress {
  echo -e "${YELLOW}Running Cypress tests in Docker...${NC}"
  check_docker

  # Create a Docker image for Cypress
  docker build -f Dockerfile.dev -t starbunk-cypress:latest .

  # Run Cypress tests
  docker run --rm \
    -v "$(pwd)":/app \
    -v "$(pwd)/cypress/screenshots":/app/cypress/screenshots \
    -v "$(pwd)/cypress/videos":/app/cypress/videos \
    starbunk-cypress:latest \
    npm run cypress:run -- --spec "cypress/e2e/snowbunk/*.cy.ts"
}

# Start application in Docker
function run_docker_start {
  echo -e "${YELLOW}Starting application in Docker...${NC}"
  check_docker
  docker-compose up -d
}

# Run all tests
function run_all {
  run_lint
  run_test
  run_build
  run_cypress
}

# Run CI tests
function run_ci {
  run_lint
  run_test
  run_build
  run_cypress_snowbunk
}

# Main function
function main {
  if [ $# -eq 0 ]; then
    print_usage
    exit 0
  fi

  case "$1" in
    lint)
      run_lint
      ;;
    test)
      run_test
      ;;
    build)
      run_build
      ;;
    start)
      run_start
      ;;
    cypress)
      run_cypress
      ;;
    cypress:open)
      run_cypress_open
      ;;
    cypress:snowbunk)
      run_cypress_snowbunk
      ;;
    docker:build)
      run_docker_build
      ;;
    docker:test)
      run_docker_test
      ;;
    docker:cypress)
      run_docker_cypress
      ;;
    docker:start)
      run_docker_start
      ;;
    all)
      run_all
      ;;
    ci)
      run_ci
      ;;
    *)
      echo -e "${RED}Unknown command: $1${NC}"
      print_usage
      exit 1
      ;;
  esac
}

# Execute main function
main "$@"
