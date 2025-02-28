/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the Banana-Bot
 *
 * This bot responds to messages containing the word "banana" in various forms
 */
describe('Banana-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ name: 'with a matching response', message: 'I ate a banana for breakfast' },
		{ name: 'at the beginning of a sentence', message: 'Banana splits are delicious' },
		{ name: 'at the end of a sentence', message: 'My favorite fruit is banana' },
		{ name: 'in the middle of a sentence', message: 'I put banana slices in my cereal' },
		{ name: 'uppercase "BANANA"', message: 'BANANA BREAD IS AMAZING' },
		{ name: 'mixed case "BaNaNa"', message: 'BaNaNa pudding is tasty' },
		{ name: 'plural "bananas"', message: 'I bought some bananas at the store' }
	];

	// Run all response tests
	responseTests.forEach(test => {
		testBot({
			botName: 'Banana-Bot',
			triggerMessage: test.message,
			expectedResponsePattern: /banana/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Test cases where the bot should NOT respond
	const noResponseTests = [
		{ name: 'a message without "banana"', message: 'I love apples' },
		{ name: 'similar but incorrect words', message: 'I like bandanas' }
	];

	// Run all no-response tests
	noResponseTests.forEach(test => {
		testBotNoResponse('Banana-Bot', test.message, channelIDs.NebulaChat);
	});
});
