/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';
import '../../support/commands';

/**
 * E2E tests for NiceBot
 *
 * These tests verify that NiceBot responds correctly to messages containing "69"
 * and ignores messages that don't contain "69".
 */
describe('Nice-Bot E2E Tests', () => {
	// In the model file it's "NiceBot" but in Cypress tests it's "Nice-Bot"
	const { TEST } = BOT_CONSTANTS.NICEBOT;
	const BOT_NAME_IN_DISCORD = 'Nice-Bot';

	// The model has "Nice." but the actual response might be "nice" (lowercase)
	// So we use a case-insensitive regex that matches both
	const RESPONSE_PATTERN = /nice\.?/i;

	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "69" with "nice"', () => {
		cy.sendDiscordMessage(
			TEST.MESSAGE.SIXTY_NINE,
			BOT_NAME_IN_DISCORD,
			RESPONSE_PATTERN,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			`${TEST.MESSAGE.SIXTY_NINE} is a funny number`,
			BOT_NAME_IN_DISCORD,
			RESPONSE_PATTERN,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			`My favorite number is ${TEST.MESSAGE.SIXTY_NINE}`,
			BOT_NAME_IN_DISCORD,
			RESPONSE_PATTERN,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" in the middle of a word', () => {
		cy.sendDiscordMessage(
			`The route${TEST.MESSAGE.SIXTY_NINE}highway is closed`,
			BOT_NAME_IN_DISCORD,
			RESPONSE_PATTERN,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" with other numbers', () => {
		cy.sendDiscordMessage(
			`The numbers are ${TEST.MESSAGE.OTHER_NUMBER}, ${TEST.MESSAGE.SIXTY_NINE}, and 420`,
			BOT_NAME_IN_DISCORD,
			RESPONSE_PATTERN,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "69"', () => {
		cy.task('sendDiscordMessage', {
			message: TEST.MESSAGE.OTHER_NUMBER,
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect numbers', () => {
		cy.task('sendDiscordMessage', {
			message: 'The answer is 6 or 9',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
