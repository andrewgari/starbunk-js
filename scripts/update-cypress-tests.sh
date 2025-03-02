#!/bin/bash

# This script updates Cypress tests for refactored bots
# Usage: ./scripts/update-cypress-tests.sh <botName>

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a bot name was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No bot name provided${NC}"
  echo -e "Usage: ./scripts/update-cypress-tests.sh <botName>"
  exit 1
fi

BOT_NAME=$1
BOT_DIR="src/starbunk/bots/reply-bots/$BOT_NAME"
MODEL_FILE="$BOT_DIR/${BOT_NAME}Model.ts"
CYPRESS_TEST_FILE="cypress/e2e/bots/${BOT_NAME}.cy.ts"
BOT_CONSTANTS_FILE="cypress/support/botConstants.ts"

# Check if the bot directory exists
if [ ! -d "$BOT_DIR" ]; then
  echo -e "${RED}Error: Bot directory $BOT_DIR does not exist${NC}"
  exit 1
fi

# Check if the model file exists
if [ ! -f "$MODEL_FILE" ]; then
  echo -e "${RED}Error: Model file $MODEL_FILE does not exist${NC}"
  exit 1
fi

# Check if the Cypress test file exists
if [ ! -f "$CYPRESS_TEST_FILE" ]; then
  echo -e "${YELLOW}Warning: Cypress test file $CYPRESS_TEST_FILE does not exist${NC}"
  echo -e "${YELLOW}Creating a new Cypress test file...${NC}"

  # Create the Cypress test file
  mkdir -p "$(dirname "$CYPRESS_TEST_FILE")"

  # Get the bot name in uppercase for constants
  BOT_NAME_UPPER=$(echo "$BOT_NAME" | tr '[:lower:]' '[:upper:]')

  # Create the Cypress test file
  cat > "$CYPRESS_TEST_FILE" << EOL
/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';
import '../../support/commands';

/**
 * E2E tests for ${BOT_NAME^} Bot
 *
 * These tests verify that ${BOT_NAME^} Bot responds correctly to specific messages
 * and ignores messages that don't match its trigger conditions.
 */
describe('${BOT_NAME^}-Bot E2E Tests', () => {
  // Get constants from botConstants.ts
  const { RESPONSE, TEST } = BOT_CONSTANTS.${BOT_NAME_UPPER}_BOT;
  const BOT_NAME_IN_DISCORD = '${BOT_NAME^}-Bot';

  before(() => {
    // Initialize Discord client before running tests
    cy.initDiscordClient();
  });

  // Add your test cases here
  it('should respond to trigger message', () => {
    cy.sendDiscordMessage(
      TEST.MESSAGE.TRIGGER,
      BOT_NAME_IN_DISCORD,
      new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      channelIDs.NebulaChat
    );
  });

  it('should NOT respond to unrelated messages', () => {
    cy.task('sendDiscordMessage', {
      message: TEST.MESSAGE.UNRELATED,
      channelId: channelIDs.NebulaChat,
      expectResponse: false
    }).then((result) => {
      expect(result).to.equal(null);
    });
  });
});
EOL

  echo -e "${GREEN}Created Cypress test file at $CYPRESS_TEST_FILE${NC}"
  echo -e "${YELLOW}Please update the test file with specific test cases for your bot.${NC}"
fi

# Check if the bot is already in botConstants.ts
if ! grep -q "${BOT_NAME_UPPER}_BOT" "$BOT_CONSTANTS_FILE"; then
  echo -e "${YELLOW}Adding bot to botConstants.ts...${NC}"

  # Get the bot name in uppercase for constants
  BOT_NAME_UPPER=$(echo "$BOT_NAME" | tr '[:lower:]' '[:upper:]')

  # Add the import to botConstants.ts
  sed -i "/^import/a import { BOT_NAME as ${BOT_NAME_UPPER}_BOT_NAME, TEST as ${BOT_NAME_UPPER}_BOT_TEST, RESPONSE as ${BOT_NAME_UPPER}_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/${BOT_NAME}/${BOT_NAME}Model';" "$BOT_CONSTANTS_FILE"

  # Add the export to botConstants.ts
  sed -i "/export const BOT_CONSTANTS = {/a \ \ ${BOT_NAME_UPPER}_BOT: {\n\ \ \ \ NAME: ${BOT_NAME_UPPER}_BOT_NAME,\n\ \ \ \ RESPONSE: ${BOT_NAME_UPPER}_BOT_RESPONSE,\n\ \ \ \ TEST: ${BOT_NAME_UPPER}_BOT_TEST\n\ \ }," "$BOT_CONSTANTS_FILE"

  echo -e "${GREEN}Added bot to botConstants.ts${NC}"
fi

echo -e "${GREEN}Cypress tests are ready for ${BOT_NAME}!${NC}"
echo -e "${YELLOW}Run the tests with:${NC}"
echo -e "npm run test:e2e -- --spec \"cypress/e2e/bots/${BOT_NAME}.cy.ts\""
