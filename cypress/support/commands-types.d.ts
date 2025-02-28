/// <reference types="cypress" />

/**
 * Extends the Cypress namespace to include custom commands
 */
declare namespace Cypress {
	interface Chainable<Subject = any> {
		/**
		 * Initialize Discord client for tests
		 * @example cy.initDiscordClient()
		 */
		initDiscordClient(): Chainable<void>;

		/**
		 * Send a message to Discord and wait for a response
		 * @param message The message to send
		 * @param botName The expected bot name in the response
		 * @param expectedResponsePattern The expected response pattern
		 * @param channelId The channel ID to send the message to
		 * @example cy.sendDiscordMessage('Hello', 'Bot-Name', /response pattern/, 'channel-id')
		 */
		sendDiscordMessage(
			message: string,
			botName: string,
			expectedResponsePattern: RegExp,
			channelId: string
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
	}
}
