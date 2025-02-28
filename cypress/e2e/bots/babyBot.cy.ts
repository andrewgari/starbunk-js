/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the Baby-Bot
 *
 * This bot responds to messages containing the word "baby" in various forms
 */
describe('Baby-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ name: 'with a matching response', message: 'Look at that cute baby' },
		{ name: 'at the beginning of a sentence', message: 'Baby shark doo doo doo' },
		{ name: 'at the end of a sentence', message: 'She is just a baby' },
		{ name: 'in the middle of a sentence', message: 'That baby doll is creepy' },
		{ name: 'uppercase "BABY"', message: 'BABY YODA IS CUTE' },
		{ name: 'mixed case "BaBy"', message: 'BaBy steps are important' },
		{ name: 'as a term of endearment', message: 'Hey baby, how are you?' }
	];

	// Run all response tests
	responseTests.forEach(test => {
		testBot({
			botName: 'Baby-Bot',
			triggerMessage: test.message,
			expectedResponsePattern: /baby/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Test cases where the bot should NOT respond
	const noResponseTests = [
		{ name: 'a message without "baby"', message: 'Look at that cute kid' },
		{ name: 'similar but incorrect words', message: 'I need to babysit tonight' }
	];

	// Run all no-response tests
	noResponseTests.forEach(test => {
		testBotNoResponse('Baby-Bot', test.message, channelIDs.NebulaChat);
	});
});
