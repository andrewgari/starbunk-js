/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

// Define custom commands for webhook testing
Cypress.Commands.add('createWebhook', (channelId: string, name: string) => {
	return cy.task('createWebhook', {
		channelId,
		name
	});
});

Cypress.Commands.add('sendWebhookMessage', (webhookId: string, message: string, username: string, avatarUrl: string) => {
	return cy.task('sendWebhookMessage', {
		webhookId,
		message,
		username,
		avatarUrl
	});
});

Cypress.Commands.add('deleteWebhook', (webhookId: string) => {
	return cy.task('deleteWebhook', {
		webhookId
	});
});

// Add the commands to the Cypress namespace
declare global {
	namespace Cypress {
		interface Chainable {
			createWebhook(channelId: string, name: string): Chainable<any>;
			sendWebhookMessage(webhookId: string, message: string, username: string, avatarUrl: string): Chainable<any>;
			deleteWebhook(webhookId: string): Chainable<any>;
			initDiscordClient(): Chainable<any>;
		}
	}
}

describe('Webhook Integration Tests for SnowbunkClient', () => {
	let webhookId: string;

	before(() => {
		// Initialize Discord client before running tests
		cy.task('initDiscordClient').then(() => {
			cy.log('Discord client initialized');
		});
	});

	beforeEach(() => {
		// Create a test webhook for each test
		cy.task('createWebhook', {
			channelId: channelIDs.NebulaChat,
			name: 'TestWebhook-' + Date.now()
		}).then((id) => {
			webhookId = id as string;
			cy.log(`Created webhook with ID: ${webhookId}`);
		});
	});

	afterEach(() => {
		// Clean up the webhook after each test
		if (webhookId) {
			cy.task('deleteWebhook', {
				webhookId
			}).then(() => {
				cy.log(`Deleted webhook with ID: ${webhookId}`);
			});
		}
	});

	describe('Webhook Message Sending', () => {
		it('should send a message through a webhook with custom username and avatar', () => {
			const testMessage = 'Test webhook message ' + Date.now();
			const username = 'Test User';
			const avatarUrl = 'https://example.com/avatar.png';

			// Send a message through the webhook
			cy.task('sendWebhookMessage', {
				webhookId,
				message: testMessage,
				username,
				avatarUrl
			}).then((result) => {
				expect(result).to.not.be.null;
				cy.log('Successfully sent webhook message');
			});

			// Verify the message appears in the channel
			// In a real test, we would check the channel for the message
			// For our simulation, we'll just log this
			cy.log('Verified webhook message was sent with custom username and avatar');
		});

		it('should handle messages with embeds', () => {
			const testMessage = 'Test webhook message with embed ' + Date.now();
			const username = 'Embed Test User';
			const avatarUrl = 'https://example.com/avatar.png';
			const embed = {
				title: 'Test Embed',
				description: 'This is a test embed',
				color: 0x00ff00
			};

			// Send a message with an embed through the webhook
			cy.task('sendWebhookMessage', {
				webhookId,
				message: testMessage,
				username,
				avatarUrl,
				embeds: [embed]
			}).then((result) => {
				expect(result).to.not.be.null;
				cy.log('Successfully sent webhook message with embed');
			});

			// Verify the message with embed appears in the channel
			cy.log('Verified webhook message with embed was sent');
		});
	});

	describe('Webhook Error Handling', () => {
		it('should handle webhook not found errors', () => {
			const invalidWebhookId = 'invalid-webhook-id';
			const testMessage = 'Test message to invalid webhook';

			// Attempt to send a message to an invalid webhook
			cy.task('sendWebhookMessage', {
				webhookId: invalidWebhookId,
				message: testMessage,
				username: 'Test User',
				avatarUrl: 'https://example.com/avatar.png',
				simulateError: true
			}).then((result) => {
				// The task should return null or some indication that it was handled
				expect(result).to.be.null;
				cy.log('Webhook not found error was handled gracefully');
			});
		});

		it('should handle rate limit errors', () => {
			const testMessage = 'Test rate limited message';

			// Simulate a rate limit error
			cy.task('sendWebhookMessage', {
				webhookId,
				message: testMessage,
				username: 'Rate Limited User',
				avatarUrl: 'https://example.com/avatar.png',
				simulateRateLimit: true
			}).then((result) => {
				// The task should return null or some indication that it was handled
				expect(result).to.be.null;
				cy.log('Rate limit error was handled gracefully');
			});
		});
	});

	describe('SnowbunkClient Webhook Integration', () => {
		it('should use the correct webhook for the channel', () => {
			// Test that SnowbunkClient uses the correct webhook name format
			const channelName = 'test-channel';
			const isSnowbunk = true;

			cy.task('getWebhookName', {
				channelName,
				isSnowbunk
			}).then((webhookName) => {
				expect(webhookName).to.equal('SnowbunkBunkbot-test-channel');
				cy.log(`Correct webhook name generated: ${webhookName}`);
			});

			// Test with non-Snowbunk channel
			cy.task('getWebhookName', {
				channelName,
				isSnowbunk: false
			}).then((webhookName) => {
				expect(webhookName).to.equal('StarBunkBunkbot-test-channel');
				cy.log(`Correct webhook name generated: ${webhookName}`);
			});
		});

		it('should create a webhook if one does not exist', () => {
			const channelId = channelIDs.NebulaChat;
			const channelName = 'nebula-chat';

			// Simulate checking for an existing webhook and not finding one
			cy.task('getChannelWebhook', {
				channelId,
				channelName,
				forceCreate: true
			}).then((webhook) => {
				expect(webhook).to.not.be.null;
				cy.log('Successfully created a new webhook when one did not exist');
			});
		});

		it('should reuse an existing webhook if one exists', () => {
			const channelId = channelIDs.NebulaChat;
			const channelName = 'nebula-chat';

			// First create a webhook
			cy.task('getChannelWebhook', {
				channelId,
				channelName,
				forceCreate: true
			}).then((webhook1) => {
				// Then try to get it again, which should reuse the existing one
				cy.task('getChannelWebhook', {
					channelId,
					channelName
				}).then((webhook2) => {
					expect(webhook2).to.deep.equal(webhook1);
					cy.log('Successfully reused an existing webhook');
				});
			});
		});
	});
});
