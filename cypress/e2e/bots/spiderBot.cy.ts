/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';

/**
 * E2E tests for SpiderBot
 *
 * These tests verify that SpiderBot responds correctly to messages containing "spiderman"
 * without a hyphen and ignores messages that use the correct "Spider-Man" spelling.
 */
describe('Spider-Bot E2E Tests', () => {
	// In the model file it's "Spider-Bot" but in Cypress tests it's "Spider-Bot" with a hyphen
	const { RESPONSE, TEST } = BOT_CONSTANTS.SPIDER_BOT;
	const BOT_NAME_IN_DISCORD = 'Spider-Bot';

	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "spiderman" with a correction message', () => {
		cy.sendDiscordMessage(
			TEST.MESSAGE.SPIDERMAN_IN_SENTENCE,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spiderman" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			`${TEST.MESSAGE.SPIDERMAN} is my favorite superhero`,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spiderman" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			`I dressed up as ${TEST.MESSAGE.SPIDERMAN}`,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "SPIDERMAN"', () => {
		cy.sendDiscordMessage(
			TEST.MESSAGE.SPIDERMAN_ALL_CAPS,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "SpIdErMaN"', () => {
		cy.sendDiscordMessage(
			'SpIdErMaN has cool powers',
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spider man" with a correction message', () => {
		cy.sendDiscordMessage(
			`${TEST.MESSAGE.SPIDER_MAN_WITH_SPACE} is my favorite superhero`,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spider man" with different spacing', () => {
		cy.sendDiscordMessage(
			'I love spider  man comics',
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to "Spider-Man" (correct hyphenation)', () => {
		cy.task('sendDiscordMessage', {
			message: TEST.MESSAGE.SPIDER_MAN_WITH_HYPHEN_CAPS,
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to messages without "spiderman" or "spider man"', () => {
		cy.task('sendDiscordMessage', {
			message: TEST.MESSAGE.UNRELATED,
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
