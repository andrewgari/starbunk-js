#!/bin/bash

# This script runs the bot tests in Cypress
# It can run all bot tests or a specific bot test

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ALL_BOTS=false
BOT_NAME=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      ALL_BOTS=true
      shift
      ;;
    --bot)
      BOT_NAME="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Run the tests
if [ "$ALL_BOTS" = true ]; then
  echo -e "${GREEN}Running all bot tests...${NC}"
  npx cypress run --spec "cypress/e2e/bots/**/*.cy.ts"
elif [ -n "$BOT_NAME" ]; then
  echo -e "${GREEN}Running tests for $BOT_NAME...${NC}"
  npx cypress run --spec "cypress/e2e/bots/${BOT_NAME}.cy.ts"
else
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  $0 --all                # Run all bot tests"
  echo -e "  $0 --bot <botName>      # Run tests for a specific bot"
  exit 1
fi
