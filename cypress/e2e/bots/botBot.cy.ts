/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the Bot-Bot
 * Tests that the bot responds to messages containing "bot" in various forms
 * and doesn't respond to unrelated messages
 */
describe('Bot-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ message: 'This bot is cool', description: 'should respond to "bot" with a matching response' },
		{ message: 'Bot commands are useful', description: 'should respond to "bot" at the beginning of a sentence' },
		{ message: 'I made a new bot', description: 'should respond to "bot" at the end of a sentence' },
		{ message: 'The bot commands are helpful', description: 'should respond to "bot" in the middle of a sentence' },
		{ message: 'BOT COMMANDS ARE GREAT', description: 'should respond to uppercase "BOT"' },
		{ message: 'BoT features are cool', description: 'should respond to mixed case "BoT"' },
		{ message: 'These bots are amazing', description: 'should respond to plural "bots"' },
		{ message: 'I love chatbots', description: 'should respond to "bot" as part of a compound word' }
	];

	// Test cases where the bot should not respond
	const noResponseTests = [
		{ message: 'This program is cool', description: 'should NOT respond to a message without "bot"' },
		{ message: 'I bought a new computer', description: 'should NOT respond to similar but incorrect words' }
	];

	// Run tests for cases where the bot should respond
	responseTests.forEach(test => {
		it(test.description, () => {
			testBot({
				botName: 'Bot-Bot',
				triggerMessage: test.message,
				expectedResponsePattern: /bot/i,
				channelId: channelIDs.NebulaChat
			});
		});
	});

	// Run tests for cases where the bot should not respond
	noResponseTests.forEach(test => {
		it(test.description, () => {
			testBotNoResponse('Bot-Bot', test.message, channelIDs.NebulaChat);
		});
	});
});
