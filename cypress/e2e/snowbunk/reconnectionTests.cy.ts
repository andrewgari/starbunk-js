/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import guildIDs from '../../../src/discord/guildIDs';

// Add the commands to the Cypress namespace
declare global {
	namespace Cypress {
		interface Chainable {
			initDiscordClient(): Chainable<any>;
		}
	}
}

describe('SnowbunkClient Reconnection Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.task('initDiscordClient').then(() => {
			cy.log('Discord client initialized');
		});
	});

	describe('Connection Recovery', () => {
		it('should reconnect after a connection loss', () => {
			// First, send a normal message to verify connection is working
			const initialMessage = 'Initial test message before disconnect';
			cy.task('sendDiscordMessage', {
				message: initialMessage,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: false
			}).then(() => {
				cy.log('Initial message sent successfully');

				// Simulate a connection loss
				cy.task('simulateDisconnect').then(() => {
					cy.log('Discord connection lost');

					// Wait for reconnection attempt (this would be handled by the client)
					cy.wait(2000);

					// Verify reconnection by sending another message
					const reconnectMessage = 'Message after reconnection';
					cy.task('sendDiscordMessage', {
						message: reconnectMessage,
						channelId: channelIDs.NebulaChat,
						guildId: guildIDs.StarbunkCrusaders,
						expectResponse: false
					}).then(() => {
						cy.log('Successfully reconnected and sent message');
					});
				});
			});
		});

		it('should handle multiple disconnects and reconnects', () => {
			// Test multiple disconnect/reconnect cycles
			const cycles = 3;

			// Function to simulate a disconnect/reconnect cycle
			const simulateCycle = (cycleNumber: number) => {
				cy.task('simulateDisconnect').then(() => {
					cy.log(`Disconnect cycle ${cycleNumber}: Discord connection lost`);

					// Wait for reconnection
					cy.wait(2000);

					// Verify reconnection
					const message = `Reconnection message for cycle ${cycleNumber}`;
					cy.task('sendDiscordMessage', {
						message,
						channelId: channelIDs.NebulaChat,
						guildId: guildIDs.StarbunkCrusaders,
						expectResponse: false
					}).then(() => {
						cy.log(`Disconnect cycle ${cycleNumber}: Successfully reconnected`);

						// Continue to next cycle if needed
						if (cycleNumber < cycles) {
							simulateCycle(cycleNumber + 1);
						}
					});
				});
			};

			// Start the first cycle
			simulateCycle(1);
		});
	});

	describe('Message Queue Recovery', () => {
		it('should queue messages during disconnection and send them after reconnection', () => {
			// Send a message to verify connection
			cy.task('sendDiscordMessage', {
				message: 'Message before queuing test',
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: false
			}).then(() => {
				// Simulate a disconnect
				cy.task('simulateDisconnect').then(() => {
					cy.log('Discord connection lost, messages will be queued');

					// Try to send messages during disconnection (these should be queued)
					const queuedMessages = [
						'Queued message 1',
						'Queued message 2',
						'Queued message 3'
					];

					// Send messages that should be queued
					queuedMessages.forEach((message, index) => {
						cy.task('sendDiscordMessage', {
							message,
							channelId: channelIDs.NebulaChat,
							guildId: guildIDs.StarbunkCrusaders,
							expectResponse: false,
							simulateQueueing: true
						}).then(() => {
							cy.log(`Message queued: ${message}`);
						});
					});

					// Simulate reconnection
					cy.task('simulateReconnect').then(() => {
						cy.log('Discord connection restored, queued messages should be sent');

						// Verify that queued messages were sent after reconnection
						cy.task('getQueuedMessagesSent').then((result) => {
							const sentMessages = result as string[];
							expect(sentMessages).to.have.length(queuedMessages.length);
							queuedMessages.forEach((message, index) => {
								expect(sentMessages[index]).to.equal(message);
							});
							cy.log('All queued messages were sent after reconnection');
						});
					});
				});
			});
		});
	});

	describe('Webhook Recovery', () => {
		it('should recreate webhooks if they become invalid after reconnection', () => {
			// First, create a webhook
			cy.task('getChannelWebhook', {
				channelId: channelIDs.NebulaChat,
				channelName: 'nebula-chat',
				forceCreate: true
			}).then((result) => {
				const webhook = result as { id: string, token: string };
				expect(webhook).to.not.be.null;
				cy.log('Webhook created successfully');

				// Simulate a disconnect that invalidates webhooks
				cy.task('simulateDisconnect', { invalidateWebhooks: true }).then(() => {
					cy.log('Discord connection lost, webhooks invalidated');

					// Simulate reconnection
					cy.task('simulateReconnect').then(() => {
						cy.log('Discord connection restored');

						// Try to use the webhook (should detect it's invalid and recreate)
						cy.task('sendWebhookMessage', {
							webhookId: webhook.id,
							message: 'Message after webhook recreation',
							username: 'Webhook Test User',
							avatarUrl: 'https://example.com/avatar.png',
							detectInvalidWebhook: true
						}).then((result) => {
							// Should have created a new webhook and sent the message
							expect(result).to.not.be.null;
							cy.log('Webhook was recreated successfully');
						});
					});
				});
			});
		});
	});

	describe('State Recovery', () => {
		it('should restore channel mappings after reconnection', () => {
			// Set up channel mappings
			cy.task('setupChannelMappings', {
				sourceChannel: channelIDs.NebulaChat,
				targetChannels: [channelIDs.NebulaBunker, channelIDs.Lounge1]
			}).then(() => {
				cy.log('Channel mappings set up');

				// Simulate a disconnect
				cy.task('simulateDisconnect').then(() => {
					cy.log('Discord connection lost');

					// Simulate reconnection
					cy.task('simulateReconnect').then(() => {
						cy.log('Discord connection restored');

						// Verify channel mappings are restored by sending a message
						const testMessage = 'Message to test channel mapping restoration';
						cy.task('sendDiscordMessage', {
							message: testMessage,
							channelId: channelIDs.NebulaChat,
							guildId: guildIDs.StarbunkCrusaders,
							expectResponse: false
						}).then(() => {
							// Verify message was synced to target channels
							cy.task('verifyMessageSynced', {
								message: testMessage,
								sourceChannel: channelIDs.NebulaChat,
								targetChannels: [channelIDs.NebulaBunker, channelIDs.Lounge1]
							}).then((result) => {
								expect(result).to.be.true;
								cy.log('Channel mappings were successfully restored after reconnection');
							});
						});
					});
				});
			});
		});
	});
});
