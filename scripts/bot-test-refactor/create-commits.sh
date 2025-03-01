#!/bin/bash

# This script creates bite-sized commits for the bot test refactoring
# It follows the commit plan outlined in the README

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating bite-sized commits for bot test refactoring...${NC}"

# Commit 1: Add bot test refactoring scripts
echo -e "${YELLOW}Commit 1: Add bot test refactoring scripts${NC}"
git add scripts/bot-test-refactor/*.sh scripts/bot-test-refactor/README.md
git commit -m "Add bot test refactoring scripts

- Add scripts to generate constants, fix types, and create templates
- Add README explaining the approach
- Move scripts to scripts/bot-test-refactor folder"

# Commit 2: Generate botConstants.ts file
echo -e "${YELLOW}Commit 2: Generate botConstants.ts file${NC}"
./scripts/bot-test-refactor/generate-bot-constants.sh
git add cypress/support/botConstants.ts
git commit -m "Generate botConstants.ts file

- Run script to generate the file
- Import constants from all bot model files
- Export constants for use in tests"

# Commit 3: Fix Cypress types
echo -e "${YELLOW}Commit 3: Fix Cypress types${NC}"
./scripts/bot-test-refactor/fix-cypress-types.sh
git add cypress/support/index.d.ts
git commit -m "Fix Cypress types

- Add type definitions for custom commands
- Fix type errors in test files
- Add BotTestConfig interface"

# Commit 4: Update example bot tests
echo -e "${YELLOW}Commit 4: Update example bot tests${NC}"
git add cypress/e2e/bots/niceBot.cy.ts cypress/e2e/bots/spiderBot.cy.ts
git commit -m "Update example bot tests

- Update niceBot.cy.ts and spiderBot.cy.ts as examples
- Use constants from model files
- Handle differences between bot names in code and in Discord
- Create flexible regex patterns for matching responses"

# Commit 5: Update allBots.cy.ts
echo -e "${YELLOW}Commit 5: Update allBots.cy.ts${NC}"
git add cypress/e2e/bots/allBots.cy.ts
git commit -m "Update allBots.cy.ts

- Use constants and helper functions
- Create a mapping between bot names in code and in Discord
- Use flexible regex patterns for matching responses"

# Commit 6: Add documentation
echo -e "${YELLOW}Commit 6: Add documentation${NC}"
git add scripts/bot-test-refactor/README-BOT-TESTS.md
git commit -m "Add documentation

- Add comments explaining the approach
- Add README with troubleshooting tips
- Document how to run the tests"

echo -e "${GREEN}All commits created!${NC}"
