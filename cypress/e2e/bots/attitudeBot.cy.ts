/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';
import '../../support/index.d.ts';

/**
 * E2E tests for the Attitude-Bot
 *
 * This bot responds to negative attitude messages containing
 * phrases like "I can't", "you can't", "they can't", or "we can't"
 * with "Not with THAT attitude!!!"
 */
describe('Attitude-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ name: 'with "I can\'t"', message: 'I can\'t solve this problem' },
		{ name: 'with "You can\'t"', message: 'You can\'t do that' },
		{ name: 'with "They can\'t"', message: 'They can\'t win this game' },
		{ name: 'with "We can\'t"', message: 'We can\'t finish this project on time' },
		{ name: 'with apostrophe omitted "cant"', message: 'I cant believe this' },
		{ name: 'with uppercase "CAN\'T"', message: 'YOU CAN\'T BE SERIOUS' },
		{ name: 'mixed case variation', message: 'They Can\'t possibly know that' },
		{ name: 'in a longer sentence', message: 'The problem is that we can\'t agree on the solution' }
	];

	// Run all response tests
	responseTests.forEach(test => {
		testBot({
			botName: 'Attitude-Bot',
			triggerMessage: test.message,
			expectedResponsePattern: /Not with THAT attitude!!!/,
			channelId: channelIDs.NebulaChat
		});
	});

	// Test cases where the bot should NOT respond
	const noResponseTests = [
		{ name: 'a message without "can\'t"', message: 'I am unable to do that' },
		{ name: 'with "cannot" instead of "can\'t"', message: 'I cannot solve this' },
		{ name: 'with "can" (positive form)', message: 'I can do this!' },
		{ name: 'with "he can\'t"', message: 'He can\'t figure it out' }, // Uses "he" not "I/you/they/we"
		{ name: 'with "she can\'t"', message: 'She can\'t join us today' } // Uses "she" not "I/you/they/we"
	];

	// Run all no-response tests
	noResponseTests.forEach(test => {
		testBotNoResponse('Attitude-Bot', test.message, channelIDs.NebulaChat);
	});
});
