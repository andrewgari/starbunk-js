/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';
import '../../support/commands';

/**
 * E2E tests for all bots in a single file
 *
 * This file tests all bots with their basic functionality
 * using constants from the model files for consistency.
 *
 * Note: We're only testing a few key bots here to avoid rate limiting issues.
 * Individual bot tests are in their own files.
 */
describe('All Bots E2E Tests', () => {
	// Map of bot names in code vs. bot names in Discord
	const BOT_NAMES_IN_DISCORD = {
		NICE_BOT: 'Nice-Bot',
		SPIDER_BOT: 'Spider-Bot',
		PICKLE_BOT: 'Xander Crews'
	};

	// Helper function to create a flexible regex pattern for bot responses
	const createFlexiblePattern = (response: string): RegExp => {
		// Create a case-insensitive pattern that's flexible with punctuation
		return new RegExp(response.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\.$/, '\\.?'), 'i');
	};

	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Spider-Bot
	describe('Spider-Bot', () => {
		it('should respond to "spiderman" with a correction message', () => {
			cy.sendDiscordMessage(
				BOT_CONSTANTS.SPIDERBOT_BOT.TEST.MESSAGE.SPIDERMAN_IN_SENTENCE,
				BOT_NAMES_IN_DISCORD.SPIDER_BOT,
				createFlexiblePattern(BOT_CONSTANTS.SPIDERBOT_BOT.RESPONSE),
				channelIDs.NebulaChat
			);
		});

		it('should NOT respond to "Spider-Man" (correct hyphenation)', () => {
			cy.task('sendDiscordMessage', {
				message: BOT_CONSTANTS.SPIDERBOT_BOT.TEST.MESSAGE.SPIDER_MAN_WITH_HYPHEN_CAPS,
				channelId: channelIDs.NebulaChat,
				expectResponse: false
			}).then((result) => {
				expect(result).to.equal(null);
			});
		});
	});

	// Nice-Bot
	describe('Nice-Bot', () => {
		it('should respond to "69" with "nice"', () => {
			cy.sendDiscordMessage(
				BOT_CONSTANTS.NICEBOT.TEST.MESSAGE.SIXTY_NINE_IN_SENTENCE,
				BOT_NAMES_IN_DISCORD.NICE_BOT,
				/nice\.?/i,
				channelIDs.NebulaChat
			);
		});
	});

	// Pickle-Bot
	describe('Pickle-Bot', () => {
		it('should respond to "gremlin" with a response', () => {
			cy.sendDiscordMessage(
				BOT_CONSTANTS.PICKLEBOT_BOT.TEST.MESSAGE.GREMLIN_IN_SENTENCE,
				BOT_NAMES_IN_DISCORD.PICKLE_BOT,
				/.+/,
				channelIDs.NebulaChat
			);
		});
	});
});
