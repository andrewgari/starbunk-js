#!/usr/bin/env node

/**
 * Bot Trigger Validation Script
 *
 * This script allows you to test which bots would trigger on a given message.
 * It loads all bots from the reply-bots directory and tests them against user input.
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Helper function to print to stdout (replacing console.log)
function print(message) {
	process.stdout.write(message + '\n');
}

// Main function to run the script
function main() {
	print('Loading bot validation environment...');

	try {
		// Import necessary modules
		const { createMockMessage } = require('../dist/__tests__/mocks/discordMocks');
		const { createMockWebhookService } = require('../dist/__tests__/mocks/serviceMocks');

		// Configure logger to be less verbose
		const { Logger } = require('../dist/services/logger');
		Logger.level = 'error'; // Suppress most logs

		// Create a capturing webhook service
		const webhookService = createMockWebhookService();
		const responses = [];

		// Override the writeMessage method to capture responses
		const originalWriteMessage = webhookService.writeMessage;
		webhookService.writeMessage = function (channel, options) {
			responses.push({
				botName: options.username,
				content: options.content,
				avatarURL: options.avatarURL
			});
			return originalWriteMessage(channel, options);
		};

		// Load all bots from the reply-bots directory
		const botsDir = path.resolve(__dirname, '../dist/starbunk/bots/reply-bots');
		const botFiles = fs.readdirSync(botsDir)
			.filter(file => file.endsWith('.js') && !file.startsWith('index'));

		print('Found ' + botFiles.length + ' bot files');

		// Load each bot
		const bots = [];
		for (const file of botFiles) {
			try {
				const fileName = file.replace('.js', '');
				const importPath = '../dist/starbunk/bots/reply-bots/' + fileName;

				// Dynamic import
				const botModule = require(importPath);

				if (!botModule || !botModule.default) {
					console.warn('No default export in bot file: ' + fileName);
					continue;
				}

				// Create bot instance
				const bot = botModule.default(webhookService);

				if (!bot) {
					console.warn('Failed to create bot from file: ' + fileName);
					continue;
				}

				// Get bot name
				const botName = bot.getIdentity().name;

				bots.push({ name: botName, bot });
				print('Loaded bot: ' + botName);
			} catch (err) {
				console.error('Error loading bot from file ' + file + ':', err);
			}
		}

		print('Successfully loaded ' + bots.length + ' bots\n');

		// Function to test a message against all bots
		function testMessage(message) {
			// Clear previous responses
			responses.length = 0;

			// Create a mock message with the user's content
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = message;

			// Process the message with each bot
			const promises = bots.map(function (botInfo) {
				return botInfo.bot.handleMessage(mockMessage);
			});

			return Promise.all(promises).then(function () {
				// Display results
				print('\n=== Results ===');

				if (responses.length === 0) {
					print('No bots would respond to this message.');
				} else {
					print(responses.length + ' bot(s) would respond:');

					responses.forEach(function (response, index) {
						print('\n[' + (index + 1) + '] ' + response.botName);
						print('Response: ' + response.content);
						print('Avatar: ' + response.avatarURL);
					});
				}

				print('\n');
			});
		}

		// Interactive loop
		function askForMessage() {
			rl.question('Enter a message to test (or "exit" to quit): ', function (message) {
				if (message.toLowerCase() === 'exit') {
					rl.close();
					return;
				}

				testMessage(message).then(function () {
					askForMessage();
				}).catch(function (err) {
					console.error('Error testing message:', err);
					askForMessage();
				});
			});
		}

		askForMessage();

	} catch (err) {
		console.error('Error initializing bot validation environment:', err);
		rl.close();
		process.exit(1);
	}
}

// Start the script
main();
