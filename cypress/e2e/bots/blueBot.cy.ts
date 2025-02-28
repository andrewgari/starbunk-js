/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the Blue-Bot
 * Tests that the bot responds to messages containing "blue" in various forms
 * and doesn't respond to unrelated messages
 */
describe('Blue-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ message: 'The sky is blue today', description: 'should respond to "blue" with a matching response' },
		{ message: 'Blue is my favorite color', description: 'should respond to "blue" at the beginning of a sentence' },
		{ message: 'My car is blue', description: 'should respond to "blue" at the end of a sentence' },
		{ message: 'The blue whale is the largest animal', description: 'should respond to "blue" in the middle of a sentence' },
		{ message: 'BLUE SKIES AHEAD', description: 'should respond to uppercase "BLUE"' },
		{ message: 'BlUe jeans are classic', description: 'should respond to mixed case "BlUe"' },
		{ message: 'I love blueberries', description: 'should respond to "blue" in compound words' }
	];

	// Test cases where the bot should not respond
	const noResponseTests = [
		{ message: 'The sky is clear today', description: 'should NOT respond to a message without "blue"' },
		{ message: 'I feel a bit glum today', description: 'should NOT respond to similar but incorrect words' }
	];

	// Run tests for cases where the bot should respond
	responseTests.forEach(test => {
		it(test.description, () => {
			testBot({
				botName: 'Blue-Bot',
				triggerMessage: test.message,
				expectedResponsePattern: /blue/i,
				channelId: channelIDs.NebulaChat
			});
		});
	});

	// Run tests for cases where the bot should not respond
	noResponseTests.forEach(test => {
		it(test.description, () => {
			testBotNoResponse('Blue-Bot', test.message, channelIDs.NebulaChat);
		});
	});
});
