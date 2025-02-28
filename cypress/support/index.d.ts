/// <reference types="cypress" />

declare namespace Cypress {
	interface Chainable<Subject = any> {
		/**
		 * Custom command to send a message to Discord and verify the bot response
		 * @param message - The message to send
		 * @param botName - The name of the bot expected to respond
		 * @param expectedResponsePattern - Regex pattern to match in the bot's response
		 * @param channelId - The channel ID to send the message to
		 */
		sendDiscordMessage(
			message: string,
			botName: string,
			expectedResponsePattern: RegExp,
			channelId: string
		): Chainable<void>;

		/**
		 * Custom command to initialize the Discord client
		 */
		initDiscordClient(): Chainable<void>;
	}
}
