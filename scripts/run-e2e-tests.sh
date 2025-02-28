#!/bin/bash

# Script to run E2E tests locally with proper environment variables

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with DISCORD_TOKEN."
  exit 1
fi

# Source the .env file to get environment variables
source .env

# Clean up Cypress artifacts before running tests
echo "Cleaning up Cypress artifacts..."
./scripts/clean-cypress.sh

# Set Cypress environment variables
export CYPRESS_DISCORD_TOKEN=$DISCORD_TOKEN
export NODE_ENV=test

# Run the E2E tests
echo "Running E2E bot tests..."
npm run test:e2e:bots

# Check if tests failed
if [ $? -ne 0 ]; then
  echo "Tests failed. Check screenshots in cypress/screenshots directory."
else
  echo "All tests passed!"
fi
