#!/bin/bash

# Script to run a specific bot test

# Check if bot name was provided
if [ -z "$1" ]; then
  echo "Error: No bot name provided."
  echo "Usage: ./scripts/test-specific-bot.sh <bot-name>"
  echo "Example: ./scripts/test-specific-bot.sh blueBot"
  exit 1
fi

BOT_NAME=$1

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

# Check if the bot test file exists
if [ ! -f "cypress/e2e/bots/${BOT_NAME}.cy.ts" ]; then
  echo "Error: Bot test file not found: cypress/e2e/bots/${BOT_NAME}.cy.ts"
  echo "Available bot tests:"
  ls -1 cypress/e2e/bots/*.cy.ts | sed 's/.*\///' | sed 's/\.cy\.ts//'
  exit 1
fi

# Run the specific bot test
echo "Running test for ${BOT_NAME}..."
npx cypress run --spec "cypress/e2e/bots/${BOT_NAME}.cy.ts"

# Check if tests failed
if [ $? -ne 0 ]; then
  echo "Tests failed. Check screenshots in cypress/screenshots directory."
else
  echo "All tests passed!"
fi
