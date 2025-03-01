#!/bin/bash

# This script helps update all bot Cypress tests to use constants from model files
# It creates a template for each bot test file that can be used as a reference

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Cypress test update script...${NC}"

# Create the botConstants.ts file if it doesn't exist
if [ ! -f "cypress/support/botConstants.ts" ]; then
  echo -e "${YELLOW}Creating botConstants.ts file...${NC}"
  # This file should be created manually with the proper imports
  echo "// Run this script after creating the botConstants.ts file" > cypress/support/botConstants.ts
fi

# Find all bot Cypress test files
for testFile in $(find cypress/e2e/bots -name "*.cy.ts" | grep -v "allBots.cy.ts"); do
  botName=$(basename "$testFile" .cy.ts)

  echo -e "${YELLOW}Processing $botName Cypress test...${NC}"

  # Create a template for the bot test file
  echo -e "${GREEN}Creating template for $botName...${NC}"

  # Convert botName to uppercase for constants
  botNameUpper=$(echo "$botName" | tr '[:lower:]' '[:upper:]')
  botNameCapitalized=$(echo "$botName" | sed 's/\([a-z]\)\([a-zA-Z0-9]*\)/\u\1\2/g')

  # Create the template - using single quotes to avoid variable substitution
  cat > "${testFile}.template" << 'EOL'
/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';

/**
 * E2E tests for BOT_NAME_CAPITALIZED
 *
 * These tests verify that BOT_NAME_CAPITALIZED responds correctly to specific messages
 * and ignores messages that don't match its trigger conditions.
 */
describe('BOT_NAME_CAPITALIZED E2E Tests', () => {
  // In the model file it's "BOT_NAME_CAPITALIZED" but in Cypress tests it's "BOT_NAME_CAPITALIZED" with a hyphen
  const { RESPONSE, TEST } = BOT_CONSTANTS.BOT_NAME_UPPER_BOT;
  const BOT_NAME_IN_DISCORD = 'BOT_NAME_CAPITALIZED';

  // Create a flexible pattern for matching responses that might have case or punctuation differences
  const RESPONSE_PATTERN = new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\.$/, '\\.?'), 'i');

  before(() => {
    // Initialize Discord client before running tests
    cy.initDiscordClient();
  });

  // Add your test cases here using the constants
  // Example:
  // it('should respond to trigger message', () => {
  //   cy.sendDiscordMessage(
  //     TEST.MESSAGE.TRIGGER_MESSAGE,
  //     BOT_NAME_IN_DISCORD,
  //     RESPONSE_PATTERN,
  //     channelIDs.NebulaChat
  //   );
  // });

  // it('should NOT respond to unrelated message', () => {
  //   cy.task('sendDiscordMessage', {
  //     message: TEST.MESSAGE.UNRELATED,
  //     channelId: channelIDs.NebulaChat,
  //     expectResponse: false
  //   }).then((result) => {
  //     expect(result).to.equal(null);
  //   });
  // });
});
EOL

  # Replace placeholders with actual values
  sed -i "s/BOT_NAME_CAPITALIZED/$botNameCapitalized/g" "${testFile}.template"
  sed -i "s/BOT_NAME_UPPER/$botNameUpper/g" "${testFile}.template"

  echo -e "${GREEN}Template created at ${testFile}.template${NC}"
  echo -e "${YELLOW}Please manually update ${testFile} using the template as a reference${NC}"
  echo ""
done

# Create a template for allBots.cy.ts
echo -e "${YELLOW}Creating template for allBots.cy.ts...${NC}"

cat > "cypress/e2e/bots/allBots.cy.ts.template" << 'EOL'
/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for all bots in a single file
 *
 * This file tests all bots with their basic functionality
 * using constants from the model files for consistency
 */
describe('All Bots E2E Tests', () => {
  // Map of bot names in code vs. bot names in Discord
  const BOT_NAMES_IN_DISCORD = {
    NICE_BOT: 'Nice-Bot',
    SPIDER_BOT: 'Spider-Bot',
    PICKLE_BOT: 'Pickle-Bot',
    HOLD_BOT: 'Hold-Bot',
    CHAOS_BOT: 'Chaos-Bot',
    BABY_BOT: 'Baby-Bot',
    GUNDAM_BOT: 'Gundam-Bot',
    EZIO_BOT: 'Ezio-Bot',
    SIGGREAT_BOT: 'SigGreat-Bot',
    BOT_BOT: 'Bot-Bot',
    CHECK_BOT: 'Check-Bot',
    VENN_BOT: 'Venn-Bot',
    SHEESH_BOT: 'Sheesh-Bot',
    MACARONI_BOT: 'Macaroni-Bot',
    ATTITUDE_BOT: 'Attitude-Bot',
    GUY_BOT: 'Guy-Bot',
    MUSIC_CORRECT_BOT: 'Music-Correct-Bot'
  };

  // Helper function to create a flexible regex pattern for bot responses
  const createFlexiblePattern = (response: string): RegExp => {
    // Create a case-insensitive pattern that's flexible with punctuation
    return new RegExp(response.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\.$/, '\\.?'), 'i');
  };

  before(() => {
    // Initialize Discord client before running tests
    cy.initDiscordClient();
  });

  // Add your bot tests here using the constants and helper functions
  // Example:
  // describe('Bot-Name', () => {
  //   testBot({
  //     botName: BOT_NAMES_IN_DISCORD.BOT_NAME,
  //     triggerMessage: BOT_CONSTANTS.BOT_NAME.TEST.MESSAGE.TRIGGER,
  //     expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.BOT_NAME.RESPONSE),
  //     channelId: channelIDs.NebulaChat
  //   });
  //
  //   testBotNoResponse(
  //     BOT_CONSTANTS.BOT_NAME.TEST.MESSAGE.UNRELATED,
  //     channelIDs.NebulaChat
  //   );
  // });
});
EOL

echo -e "${GREEN}Template created at cypress/e2e/bots/allBots.cy.ts.template${NC}"
echo -e "${YELLOW}Please manually update allBots.cy.ts using the template as a reference${NC}"

echo -e "${GREEN}All bot test templates have been created!${NC}"
echo -e "${YELLOW}Please manually update the test files using the templates as a reference${NC}"
