#!/bin/bash

# This script runs all the refactoring steps for a bot
# Usage: ./scripts/refactor-bot-complete.sh <botName>

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a bot name was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No bot name provided${NC}"
  echo -e "Usage: ./scripts/refactor-bot-complete.sh <botName>"
  exit 1
fi

BOT_NAME=$1
BOT_DIR="src/starbunk/bots/reply-bots/$BOT_NAME"

# Check if the bot directory exists
if [ ! -d "$BOT_DIR" ]; then
  echo -e "${RED}Error: Bot directory $BOT_DIR does not exist${NC}"
  exit 1
fi

# Step 1: Create the directory structure
echo -e "${YELLOW}Step 1: Creating directory structure for $BOT_NAME...${NC}"
./scripts/refactor-bot.sh "$BOT_NAME"

# Step 2: Update the tests
echo -e "${YELLOW}Step 2: Updating unit tests for $BOT_NAME...${NC}"
./scripts/update-bot-tests.sh "$BOT_NAME"

# Step 3: Update Cypress tests
echo -e "${YELLOW}Step 3: Updating Cypress tests for $BOT_NAME...${NC}"
./scripts/update-cypress-tests.sh "$BOT_NAME"

# Step 4: Run the unit tests
echo -e "${YELLOW}Step 4: Running unit tests for $BOT_NAME...${NC}"
./scripts/test-refactored-bot.sh "$BOT_NAME"

# Step 5: Run the Cypress tests
echo -e "${YELLOW}Step 5: Running Cypress tests for $BOT_NAME...${NC}"
npm run test:e2e -- --spec "cypress/e2e/bots/${BOT_NAME}.cy.ts"

echo -e "${GREEN}Refactoring complete for $BOT_NAME!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Implement the condition classes in $BOT_DIR/conditions/"
echo -e "2. Implement the response generators in $BOT_DIR/responses/"
echo -e "3. Update the main bot file to use the new components"
echo -e "4. Run the tests again to ensure everything works"
