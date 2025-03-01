#!/bin/bash

# This script runs all the steps to refactor the bot tests
# It generates the botConstants.ts file, fixes the Cypress types,
# and creates templates for the bot test files

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting bot test refactoring...${NC}"

# Make all scripts executable
chmod +x scripts/bot-test-refactor/*.sh

# Step 1: Generate the botConstants.ts file
echo -e "${YELLOW}Step 1: Generating botConstants.ts file...${NC}"
./scripts/bot-test-refactor/generate-bot-constants.sh

# Step 2: Fix the Cypress types
echo -e "${YELLOW}Step 2: Fixing Cypress types...${NC}"
./scripts/bot-test-refactor/fix-cypress-types.sh

# Step 3: Create templates for the bot test files
echo -e "${YELLOW}Step 3: Creating templates for bot test files...${NC}"
./scripts/bot-test-refactor/update-cypress-tests.sh

echo -e "${GREEN}Bot test refactoring complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update the bot test files using the templates"
echo -e "2. Run the tests using ./scripts/bot-test-refactor/run-bot-tests.sh"
