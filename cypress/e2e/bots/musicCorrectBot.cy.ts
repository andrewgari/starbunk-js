/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for the Music-Correct-Bot
 *
 * This bot responds to users who try to use old music commands (!play or ?play)
 * with a message informing them about the new /play command format.
 */
describe('Music-Correct-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test cases where the bot should respond
	const responseTests = [
		{ name: 'with a correction message', message: '!play despacito' },
		{ name: 'with different songs', message: '!play never gonna give you up' },
		{ name: 'with no song specified', message: '!play' },
		{ name: 'with uppercase', message: '!PLAY some music' },
		{ name: 'with mixed case', message: '!PlAy a song' },
		{ name: 'when user tries to use old music command', message: '!play something' }
	];

	// Run all response tests
	responseTests.forEach(test => {
		testBot({
			botName: 'Music-Correct-Bot',
			triggerMessage: test.message,
			expectedResponsePattern: /Use \/play instead of !play/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Test cases where the bot should NOT respond
	const noResponseTests = [
		{ name: '"/play" (correct command)', message: '/play despacito' },
		{ name: 'other commands', message: '!skip' },
		{ name: 'messages about playing without the command', message: 'I want to play some music' }
	];

	// Run all no-response tests
	noResponseTests.forEach(test => {
		testBotNoResponse('Music-Correct-Bot', test.message, channelIDs.NebulaChat);
	});
});
