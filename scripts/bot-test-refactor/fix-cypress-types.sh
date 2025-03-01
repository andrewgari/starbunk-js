#!/bin/bash

# This script fixes the type errors in Cypress by updating the index.d.ts file
# It ensures that custom commands like initDiscordClient and sendDiscordMessage are properly typed

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Fixing Cypress types...${NC}"

# Check if the index.d.ts file exists
if [ ! -f "cypress/support/index.d.ts" ]; then
  echo -e "${YELLOW}Creating index.d.ts file...${NC}"
  mkdir -p cypress/support
  touch cypress/support/index.d.ts
fi

# Update the index.d.ts file
cat > "cypress/support/index.d.ts" << EOL
/// <reference types="cypress" />

/**
 * Bot test configuration interface
 */
interface BotTestConfig {
	botName: string;
	triggerMessage: string;
	expectedResponsePattern: RegExp;
	channelId?: string;
}

/**
 * Extends the Cypress namespace to include custom commands for Discord bot testing
 */
declare namespace Cypress {
	interface Chainable<Subject = any> {
		/**
		 * Initialize Discord client for tests
		 * @example cy.initDiscordClient()
		 */
		initDiscordClient(): Chainable<void>;

		/**
		 * Send a message to Discord and verify the bot response
		 * @param message The message to send
		 * @param botName The expected bot name in the response
		 * @param expectedResponsePattern The expected response pattern (regex)
		 * @param channelId Optional channel ID to send the message to
		 * @example cy.sendDiscordMessage('Hello', 'Bot-Name', /response pattern/, 'channel-id')
		 */
		sendDiscordMessage(
			message: string,
			botName: string,
			expectedResponsePattern: RegExp,
			channelId?: string
		): Chainable<void>;

		/**
		 * Simulate a message from a user and render the response in the test UI
		 * @param message The message to simulate
		 * @param userId The user ID to simulate the message from
		 * @example cy.simulateMessage('Hello', '123456789')
		 */
		simulateMessage(
			message: string,
			userId: string
		): Chainable<void>;

		/**
		 * Test a bot with the given configuration
		 * @param config The bot test configuration
		 * @example cy.testBot({ botName: 'Bot-Name', triggerMessage: 'Hello', expectedResponsePattern: /response/ })
		 */
		testBot(config: BotTestConfig): Chainable<void>;

		/**
		 * Test that a bot does not respond to a message
		 * @param message The message that should not trigger the bot
		 * @param channelId Optional channel ID to send the message to
		 * @example cy.testBotNoResponse('Hello', 'channel-id')
		 */
		testBotNoResponse(message: string, channelId?: string): Chainable<void>;
	}
}
EOL

echo -e "${GREEN}Updated cypress/support/index.d.ts${NC}"
