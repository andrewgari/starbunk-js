import { Client, TextChannel } from 'discord.js';
import { getClient } from '../../src/discord/clientInstance';

/**
 * @type {Cypress.PluginConfig}
 */
export default (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
	// `on` is used to hook into various events Cypress emits
	// `config` is the resolved Cypress config

	// Initialize Discord client
	let discordClient: Client | null = null;

	on('task', {
		// Initialize Discord client
		async initDiscordClient() {
			try {
				discordClient = getClient();
				await discordClient.login(process.env.DISCORD_TOKEN);
				return null;
			} catch (error) {
				console.error('Failed to initialize Discord client:', error);
				throw error;
			}
		},

		// Send a message to Discord and wait for a response
		async sendDiscordMessage({ message, channelId, guildId, expectResponse = true }) {
			if (!discordClient) {
				throw new Error('Discord client not initialized. Call initDiscordClient first.');
			}

			try {
				// Get the channel
				const channel = await discordClient.channels.fetch(channelId) as TextChannel;

				// Send the message
				await channel.send(message);

				// If we don't expect a response, return null after a short delay
				if (!expectResponse) {
					return new Promise((resolve) => {
						setTimeout(() => {
							resolve(null);
						}, 2000); // Wait 2 seconds to ensure no response
					});
				}

				// Wait for the bot to respond (using a promise with timeout)
				return new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error('Timeout waiting for bot response'));
					}, 5000); // 5 second timeout

					// Create a message collector to listen for bot responses
					const collector = channel.createMessageCollector({
						filter: (msg) => msg.author.bot && msg.content.length > 0,
						time: 5000, // 5 second timeout
						max: 1 // Only collect one message
					});

					collector.on('collect', (msg) => {
						clearTimeout(timeout);
						resolve({
							author: {
								username: msg.author.username
							},
							content: msg.content
						});
					});

					collector.on('end', (collected) => {
						if (collected.size === 0) {
							clearTimeout(timeout);
							reject(new Error('No bot response received'));
						}
					});
				});
			} catch (error) {
				console.error('Failed to send Discord message:', error);
				throw error;
			}
		}
	});

	return config;
};
