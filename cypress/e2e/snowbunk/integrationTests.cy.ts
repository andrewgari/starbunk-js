/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import guildIDs from '../../../src/discord/guildIDs';

// Define response type for better type safety
interface DiscordResponse {
	content: string;
	author: {
		username: string;
	};
}

// Add the commands to the Cypress namespace
declare global {
	namespace Cypress {
		interface Chainable {
			initDiscordClient(): Chainable<any>;
		}
	}
}

describe('SnowbunkClient Integration Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.task('initDiscordClient').then(() => {
			cy.log('Discord client initialized');
		});
	});

	describe('Integration with Command Handlers', () => {
		it('should handle snowbunk commands correctly', () => {
			// Test the !snowbunk command
			const commandMessage = '!snowbunk status';

			cy.task('sendDiscordMessage', {
				message: commandMessage,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: true,
				isCommand: true
			}).then((result) => {
				const response = result as DiscordResponse;
				expect(response).to.not.be.null;
				expect(response.content).to.include('Snowbunk Status');
				cy.log('Snowbunk command was handled correctly');
			});
		});

		it('should handle snowbunk link command', () => {
			// Test the !snowbunk link command
			const linkCommand = '!snowbunk link #nebula-chat #nebula-bunker';

			cy.task('sendDiscordMessage', {
				message: linkCommand,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: true,
				isCommand: true,
				hasAdminPermission: true
			}).then((result) => {
				const response = result as DiscordResponse;
				expect(response).to.not.be.null;
				expect(response.content).to.include('successfully linked');
				cy.log('Snowbunk link command was handled correctly');
			});
		});

		it('should handle snowbunk unlink command', () => {
			// Test the !snowbunk unlink command
			const unlinkCommand = '!snowbunk unlink #nebula-chat #nebula-bunker';

			cy.task('sendDiscordMessage', {
				message: unlinkCommand,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: true,
				isCommand: true,
				hasAdminPermission: true
			}).then((result) => {
				const response = result as DiscordResponse;
				expect(response).to.not.be.null;
				expect(response.content).to.include('successfully unlinked');
				cy.log('Snowbunk unlink command was handled correctly');
			});
		});

		it('should reject commands from users without permissions', () => {
			// Test command without admin permissions
			const linkCommand = '!snowbunk link #nebula-chat #nebula-bunker';

			cy.task('sendDiscordMessage', {
				message: linkCommand,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: true,
				isCommand: true,
				hasAdminPermission: false
			}).then((result) => {
				const response = result as DiscordResponse;
				expect(response).to.not.be.null;
				expect(response.content).to.include('You do not have permission');
				cy.log('Command was correctly rejected due to lack of permissions');
			});
		});
	});

	describe('Integration with Message Formatters', () => {
		it('should format messages with embeds correctly', () => {
			// Send a message with an embed
			const embedMessage = {
				content: 'Message with embed',
				embeds: [{
					title: 'Test Embed',
					description: 'This is a test embed',
					color: 0x00ff00
				}]
			};

			cy.task('sendDiscordMessage', {
				message: JSON.stringify(embedMessage),
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: false,
				hasEmbed: true
			}).then(() => {
				// Verify the message was synced with the embed
				cy.task('verifyMessageWithEmbed', {
					sourceChannel: channelIDs.NebulaChat,
					targetChannel: channelIDs.NebulaBunker,
					embedTitle: 'Test Embed'
				}).then((result) => {
					expect(result).to.be.true;
					cy.log('Message with embed was correctly synced');
				});
			});
		});

		it('should format messages with attachments correctly', () => {
			// Send a message with an attachment
			cy.task('sendDiscordMessage', {
				message: 'Message with attachment',
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: false,
				hasAttachment: true,
				attachmentUrl: 'https://example.com/test-image.png'
			}).then(() => {
				// Verify the message was synced with the attachment
				cy.task('verifyMessageWithAttachment', {
					sourceChannel: channelIDs.NebulaChat,
					targetChannel: channelIDs.NebulaBunker,
					attachmentUrl: 'https://example.com/test-image.png'
				}).then((result) => {
					expect(result).to.be.true;
					cy.log('Message with attachment was correctly synced');
				});
			});
		});

		it('should format messages with code blocks correctly', () => {
			// Send a message with a code block
			const codeBlockMessage = '```javascript\nconst test = "Hello World";\nconsole.log(test);\n```';

			cy.task('sendDiscordMessage', {
				message: codeBlockMessage,
				channelId: channelIDs.NebulaChat,
				guildId: guildIDs.StarbunkCrusaders,
				expectResponse: false
			}).then(() => {
				// Verify the message was synced with the code block
				cy.task('verifyMessageFormatting', {
					sourceChannel: channelIDs.NebulaChat,
					targetChannel: channelIDs.NebulaBunker,
					originalMessage: codeBlockMessage
				}).then((result) => {
					expect(result).to.be.true;
					cy.log('Message with code block was correctly synced');
				});
			});
		});
	});

	describe('Integration with Database', () => {
		it('should persist channel mappings across restarts', () => {
			// Set up channel mappings
			cy.task('setupChannelMappings', {
				sourceChannel: channelIDs.NebulaChat,
				targetChannels: [channelIDs.NebulaBunker, channelIDs.Lounge1]
			}).then(() => {
				cy.log('Channel mappings set up');

				// Simulate a client restart
				cy.task('simulateClientRestart').then(() => {
					cy.log('Client restarted, should load mappings from database');

					// Verify mappings were loaded from database
					cy.task('verifyChannelMappingsLoaded', {
						sourceChannel: channelIDs.NebulaChat,
						expectedTargetChannels: [channelIDs.NebulaBunker, channelIDs.Lounge1]
					}).then((result) => {
						expect(result).to.be.true;
						cy.log('Channel mappings were correctly loaded from database');
					});
				});
			});
		});

		it('should update database when channel mappings change', () => {
			// Add a new channel mapping
			const newTargetChannel = channelIDs.NoGuyLounge;

			cy.task('addChannelMapping', {
				sourceChannel: channelIDs.NebulaChat,
				targetChannel: newTargetChannel
			}).then(() => {
				cy.log('New channel mapping added');

				// Verify the database was updated
				cy.task('verifyDatabaseUpdated', {
					sourceChannel: channelIDs.NebulaChat,
					targetChannel: newTargetChannel
				}).then((result) => {
					expect(result).to.be.true;
					cy.log('Database was correctly updated with new channel mapping');
				});
			});
		});
	});

	describe('Integration with Event System', () => {
		it('should emit events when messages are synced', () => {
			// Set up event listener
			cy.task('setupEventListener', {
				eventName: 'messageSynced'
			}).then(() => {
				cy.log('Event listener set up');

				// Send a message that should trigger the event
				const testMessage = 'Message to trigger event';
				cy.task('sendDiscordMessage', {
					message: testMessage,
					channelId: channelIDs.NebulaChat,
					guildId: guildIDs.StarbunkCrusaders,
					expectResponse: false
				}).then(() => {
					// Verify the event was emitted
					cy.task('verifyEventEmitted', {
						eventName: 'messageSynced',
						expectedData: {
							sourceChannel: channelIDs.NebulaChat,
							message: testMessage
						}
					}).then((result) => {
						expect(result).to.be.true;
						cy.log('Event was correctly emitted when message was synced');
					});
				});
			});
		});

		it('should emit events when channel mappings change', () => {
			// Set up event listener
			cy.task('setupEventListener', {
				eventName: 'channelMappingChanged'
			}).then(() => {
				cy.log('Event listener set up');

				// Change a channel mapping
				cy.task('removeChannelMapping', {
					sourceChannel: channelIDs.NebulaChat,
					targetChannel: channelIDs.NoGuyLounge
				}).then(() => {
					// Verify the event was emitted
					cy.task('verifyEventEmitted', {
						eventName: 'channelMappingChanged',
						expectedData: {
							sourceChannel: channelIDs.NebulaChat,
							action: 'remove',
							targetChannel: channelIDs.NoGuyLounge
						}
					}).then((result) => {
						expect(result).to.be.true;
						cy.log('Event was correctly emitted when channel mapping changed');
					});
				});
			});
		});
	});
});
