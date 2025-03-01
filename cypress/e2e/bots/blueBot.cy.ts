/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the BlueBot
 * Tests that the bot responds to messages containing "blue" in various forms,
 * follows up with cheeky responses, and doesn't respond to unrelated messages
 */
describe('BlueBot E2E Tests', () => {
	// Skip initialization if it's not available in the test environment
	before(() => {
		// Use try-catch to handle the initialization safely
		try {
			// @ts-expect-error - initDiscordClient may exist at runtime but not in types
			cy.initDiscordClient();
		} catch (e) {
			cy.log('initDiscordClient not available, skipping initialization');
		}
	});

	// Test cases where the bot should respond with initial message
	const initialResponseTests = [
		{ message: 'The sky is blue today', description: 'should respond to "blue" with initial response' },
		{ message: 'Blue is my favorite color', description: 'should respond to "blue" at the beginning of a sentence' },
		{ message: 'My car is blue', description: 'should respond to "blue" at the end of a sentence' },
		{ message: 'The blue whale is the largest animal', description: 'should respond to "blue" in the middle of a sentence' },
		{ message: 'BLUE SKIES AHEAD', description: 'should respond to uppercase "BLUE"' },
		{ message: 'BlUe jeans are classic', description: 'should respond to mixed case "BlUe"' },
		{ message: 'I love blueberries', description: 'should respond to "blue" in compound words' }
	];

	// Test cases for follow-up responses
	const followUpTests = [
		{ message: 'Yes, someone said blue', description: 'should respond with cheeky message to acknowledgment' },
		{ message: 'I heard blue too', description: 'should respond with cheeky message to blue mention' }
	];

	// Test cases for nice messages
	const niceMessageTests = [
		{ message: 'bluebot, say something nice about TestUser', description: 'should respond with nice message about named user', expectedResponse: /TestUser, I think you're really blu! :wink:/ },
		{ message: 'bluebot, say something nice about me', description: 'should respond with nice message about sender', expectedResponse: /\w+, I think you're really blu! :wink:/ }
	];

	// Test cases where the bot should not respond
	const noResponseTests = [
		{ message: 'The sky is clear today', description: 'should NOT respond to a message without "blue"' },
		{ message: 'I feel a bit glum today', description: 'should NOT respond to similar but incorrect words' }
	];

	// Run tests for cases where the bot should respond with initial message
	initialResponseTests.forEach(test => {
		it(test.description, () => {
			testBot({
				botName: 'BlueBot',
				triggerMessage: test.message,
				expectedResponsePattern: /Did somebody say Blu/,
				channelId: channelIDs.NebulaChat
			});
		});
	});

	// Test the conversation flow
	it('should respond with cheeky message after initial response', () => {
		// First message should get initial response
		testBot({
			botName: 'BlueBot',
			triggerMessage: 'blue',
			expectedResponsePattern: /Did somebody say Blu/,
			channelId: channelIDs.NebulaChat
		});

		// Second message should get cheeky response
		cy.wait(1000); // Wait a bit to ensure the first message is processed
		testBot({
			botName: 'BlueBot',
			triggerMessage: 'blue again',
			expectedResponsePattern: /.*BLU.*/i, // Match any of the cheeky responses
			channelId: channelIDs.NebulaChat
		});
	});

	// Test acknowledgment responses
	it('should respond to acknowledgment after initial message', () => {
		// First message should get initial response
		testBot({
			botName: 'BlueBot',
			triggerMessage: 'blue',
			expectedResponsePattern: /Did somebody say Blu/,
			channelId: channelIDs.NebulaChat
		});

		// Acknowledgment should get cheeky response
		cy.wait(1000); // Wait a bit to ensure the first message is processed
		testBot({
			botName: 'BlueBot',
			triggerMessage: 'yes, someone said blue',
			expectedResponsePattern: /.*BLU.*/i, // Match any of the cheeky responses
			channelId: channelIDs.NebulaChat
		});
	});

	// Test nice message responses
	niceMessageTests.forEach(test => {
		it(test.description, () => {
			testBot({
				botName: 'BlueBot',
				triggerMessage: test.message,
				expectedResponsePattern: test.expectedResponse,
				channelId: channelIDs.NebulaChat
			});
		});
	});

	// Test mean message about Venn
	it('should respond with mean message about Venn', () => {
		testBot({
			botName: 'BlueBot',
			triggerMessage: 'bluebot say something nice about venn',
			expectedResponsePattern: /No way, Venn can suck my blu cane/,
			channelId: channelIDs.NebulaChat
		});
	});

	// Run tests for cases where the bot should not respond
	noResponseTests.forEach(test => {
		it(test.description, () => {
			testBotNoResponse('BlueBot', test.message, channelIDs.NebulaChat);
		});
	});
});
