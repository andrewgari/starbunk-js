import channelIDs from '../../src/discord/channelIDs';

/**
 * Bot test configuration interface
 */
export interface BotTestConfig {
	botName: string;
	triggerMessage: string;
	expectedResponsePattern: RegExp;
	channelId?: string;
}

/**
 * Test a bot with the given configuration
 * @param config The bot test configuration
 */
export function testBot(config: BotTestConfig): void {
	const {
		botName,
		triggerMessage,
		expectedResponsePattern,
		channelId = channelIDs.NebulaChat
	} = config;

	it(`should respond to "${triggerMessage}" with a matching response`, () => {
		cy.sendDiscordMessage(
			triggerMessage,
			botName,
			expectedResponsePattern,
			channelId
		);
	});
}

/**
 * Test that a bot does not respond to a message
 * @param botName The name of the bot
 * @param message The message that should not trigger the bot
 * @param channelId The channel ID to send the message to
 */
export function testBotNoResponse(
	botName: string,
	message: string,
	channelId: string = channelIDs.NebulaChat
): void {
	it(`should NOT respond to "${message}"`, () => {
		cy.task('sendDiscordMessage', {
			message,
			channelId,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
}
