import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		setupNodeEvents(on, config) {
			// Import plugins directly here
			on('task', {
				// Initialize Discord client
				async initDiscordClient() {
					console.log('Initializing Discord client');
					// In real implementation, this would connect to Discord
					return null;
				},

				// Send a message to Discord and wait for a response
				async sendDiscordMessage({ message, channelId, guildId, expectResponse = true }) {
					console.log(`Sending message: "${message}" to channel: ${channelId}`);

					// For testing purposes, simulate responses based on message content
					if (!expectResponse) {
						return null;
					}

					// Mock responses based on message content
					const lowerMessage = message.toLowerCase();

					if (lowerMessage.includes('spiderman') || /spider\s+man/.test(lowerMessage)) {
						return {
							author: { username: 'Spider-Bot' },
							content: 'Hey, it\'s "**Spider-Man**"! Don\'t forget the hyphen! Not Spiderman, that\'s dumb'
						};
					}

					if (lowerMessage.includes('sheesh')) {
						return {
							author: { username: 'Sheesh-Bot' },
							content: 'sheeeeeesh'
						};
					}

					if (lowerMessage.includes('pickle')) {
						return {
							author: { username: 'Pickle-Bot' },
							content: 'I turned myself into a pickle, Morty!'
						};
					}

					if (lowerMessage.includes('69')) {
						return {
							author: { username: 'Nice-Bot' },
							content: 'nice'
						};
					}

					if (lowerMessage.includes('!play')) {
						return {
							author: { username: 'Music-Correct-Bot' },
							content: 'Use /play instead of !play'
						};
					}

					if (lowerMessage.includes('macaroni')) {
						return {
							author: { username: 'Macaroni-Bot' },
							content: 'macaroni'
						};
					}

					if (lowerMessage.includes('hold')) {
						return {
							author: { username: 'Hold-Bot' },
							content: 'hold the door'
						};
					}

					if (lowerMessage.includes('gundam')) {
						return {
							author: { username: 'Gundam-Bot' },
							content: 'gundam'
						};
					}

					if (lowerMessage.includes('check')) {
						return {
							author: { username: 'Check-Bot' },
							content: 'czech'
						};
					}

					if (lowerMessage.includes('chaos')) {
						return {
							author: { username: 'Chaos-Bot' },
							content: 'chaos'
						};
					}

					if (lowerMessage.includes('baby')) {
						return {
							author: { username: 'Baby-Bot' },
							content: 'baby'
						};
					}

					if (lowerMessage.includes('banana')) {
						return {
							author: { username: 'Banana-Bot' },
							content: 'banana'
						};
					}

					if (lowerMessage.includes('guy')) {
						return {
							author: { username: 'Guy-Bot' },
							content: 'guy'
						};
					}

					if (lowerMessage.includes('ezio') || lowerMessage.includes('assassin')) {
						return {
							author: { username: 'Ezio-Bot' },
							content: 'assassin'
						};
					}

					if (lowerMessage.includes('blue')) {
						return {
							author: { username: 'Blue-Bot' },
							content: 'blue'
						};
					}

					if (lowerMessage.includes('venn')) {
						return {
							author: { username: 'Venn-Bot' },
							content: 'venn'
						};
					}

					if (lowerMessage.includes('sig')) {
						return {
							author: { username: 'SigGreat-Bot' },
							content: 'sig'
						};
					}

					if (lowerMessage.includes('bot')) {
						return {
							author: { username: 'Bot-Bot' },
							content: 'bot'
						};
					}

					// Default mock response
					return {
						author: { username: 'Test-Bot' },
						content: `Response to: ${message}`
					};
				}
			});

			require('@cypress/code-coverage/task')(on, config);
			return config;
		},
		specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: 'cypress/support/e2e.ts',
	},
	env: {
		codeCoverage: {
			exclude: ['cypress/**/*.*'],
		},
	},
});
