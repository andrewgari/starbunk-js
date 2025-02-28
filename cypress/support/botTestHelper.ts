/**
 * Helper functions for testing bots in Cypress E2E tests
 * These functions provide a standardized way to test bot responses
 * and non-responses to various messages.
 */

import channelIDs from '../../src/discord/channelIDs';

interface BotTestParams {
	botName: string;
	triggerMessage: string;
	expectedResponsePattern: RegExp;
	channelId?: string;
}

// Default test user ID
const DEFAULT_USER_ID = '123456789';

/**
 * Tests that a bot responds correctly to a specific trigger message
 * @param params Object containing botName, triggerMessage, and expectedResponsePattern
 */
export function testBot(params: BotTestParams): void {
	const {
		botName,
		triggerMessage,
		expectedResponsePattern,
		channelId = channelIDs.NebulaChat
	} = params;

	it(`${botName} should respond to "${triggerMessage}"`, () => {
		cy.sendDiscordMessage(
			triggerMessage,
			botName,
			expectedResponsePattern,
			channelId
		);
	});
}

/**
 * Tests that a bot does not respond to a specific message
 * @param botName The name of the bot being tested
 * @param message The message that should not trigger a response
 * @param channelId Optional channel ID to send the message to
 */
export function testBotNoResponse(botName: string, message: string, channelId?: string): void {
	it(`${botName} should not respond to "${message}"`, () => {
		cy.testBotNoResponse(message, channelId);
	});
}
