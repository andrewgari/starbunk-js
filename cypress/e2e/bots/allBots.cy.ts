/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import BOT_CONSTANTS from '../../support/botConstants';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for all bots in a single file
 *
 * This file tests all bots with their basic functionality
 * using constants from the model files for consistency
 */
describe('All Bots E2E Tests', () => {
	// Map of bot names in code vs. bot names in Discord
	const BOT_NAMES_IN_DISCORD = {
		NICE_BOT: 'Nice-Bot',
		SPIDER_BOT: 'Spider-Bot',
		PICKLE_BOT: 'Pickle-Bot',
		HOLD_BOT: 'Hold-Bot',
		CHAOS_BOT: 'Chaos-Bot',
		BABY_BOT: 'Baby-Bot',
		GUNDAM_BOT: 'Gundam-Bot',
		EZIO_BOT: 'Ezio-Bot',
		SIGGREAT_BOT: 'SigGreat-Bot',
		BOT_BOT: 'Bot-Bot',
		CHECK_BOT: 'Check-Bot',
		VENN_BOT: 'Venn-Bot',
		SHEESH_BOT: 'Sheesh-Bot',
		MACARONI_BOT: 'Macaroni-Bot',
		ATTITUDE_BOT: 'Attitude-Bot',
		GUY_BOT: 'Guy-Bot',
		MUSIC_CORRECT_BOT: 'Music-Correct-Bot'
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
		testBot({
			botName: BOT_NAMES_IN_DISCORD.SPIDER_BOT,
			triggerMessage: BOT_CONSTANTS.SPIDER_BOT.TEST.MESSAGE.SPIDERMAN_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.SPIDER_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});

		testBotNoResponse(
			BOT_CONSTANTS.SPIDER_BOT.TEST.MESSAGE.SPIDER_MAN_WITH_HYPHEN_CAPS,
			channelIDs.NebulaChat
		);
	});

	// Sheesh-Bot
	describe('Sheesh-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.SHEESH_BOT,
			triggerMessage: BOT_CONSTANTS.SHEESH_BOT.TEST.MESSAGE.SHEESH_IN_SENTENCE,
			expectedResponsePattern: /sh(e+)sh/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Pickle-Bot
	describe('Pickle-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.PICKLE_BOT,
			triggerMessage: BOT_CONSTANTS.PICKLE_BOT.TEST.MESSAGE.GREMLIN_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.PICKLE_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Nice-Bot
	describe('Nice-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.NICE_BOT,
			triggerMessage: BOT_CONSTANTS.NICE_BOT.TEST.MESSAGE.SIXTY_NINE_IN_SENTENCE,
			expectedResponsePattern: /nice\.?/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Attitude-Bot
	describe('Attitude-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.ATTITUDE_BOT,
			triggerMessage: BOT_CONSTANTS.ATTITUDE_BOT.TEST.MESSAGE.I_CANT,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.ATTITUDE_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});

		testBotNoResponse(
			BOT_CONSTANTS.ATTITUDE_BOT.TEST.MESSAGE.UNRELATED,
			channelIDs.NebulaChat
		);
	});

	// Music-Correct-Bot
	describe('Music-Correct-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.MUSIC_CORRECT_BOT,
			triggerMessage: BOT_CONSTANTS.MUSIC_CORRECT_BOT.TEST.MESSAGE.PLAY_EXCLAMATION,
			expectedResponsePattern: /Use \/play instead of !play/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Macaroni-Bot
	describe('Macaroni-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.MACARONI_BOT,
			triggerMessage: BOT_CONSTANTS.MACARONI_BOT.TEST.MESSAGE.VENN_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.MACARONI_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Hold-Bot
	describe('Hold-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.HOLD_BOT,
			triggerMessage: BOT_CONSTANTS.HOLD_BOT.TEST.MESSAGE.HOLD_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.HOLD_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Gundam-Bot
	describe('Gundam-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.GUNDAM_BOT,
			triggerMessage: BOT_CONSTANTS.GUNDAM_BOT.TEST.MESSAGE.GUNDAM_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.GUNDAM_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Check-Bot
	describe('Check-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.CHECK_BOT,
			triggerMessage: BOT_CONSTANTS.CHECK_BOT.TEST.MESSAGE.CHECK_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.CHECK_BOT.CZECH_RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Chaos-Bot
	describe('Chaos-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.CHAOS_BOT,
			triggerMessage: BOT_CONSTANTS.CHAOS_BOT.TEST.MESSAGE.CHAOS_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.CHAOS_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Baby-Bot
	describe('Baby-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.BABY_BOT,
			triggerMessage: BOT_CONSTANTS.BABY_BOT.TEST.MESSAGE.BABY_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.BABY_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Guy-Bot
	describe('Guy-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.GUY_BOT,
			triggerMessage: BOT_CONSTANTS.GUY_BOT.TEST.MESSAGE.WITH_GUY,
			// Guy bot has multiple possible responses, so we just check for any response
			expectedResponsePattern: /.+/,
			channelId: channelIDs.NebulaChat
		});
	});

	// Ezio-Bot
	describe('Ezio-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.EZIO_BOT,
			triggerMessage: BOT_CONSTANTS.EZIO_BOT.TEST.MESSAGE.WITH_EZIO,
			expectedResponsePattern: new RegExp(BOT_CONSTANTS.EZIO_BOT.RESPONSE.replace('{username}', '.*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
			channelId: channelIDs.NebulaChat
		});
	});

	// Venn-Bot
	describe('Venn-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.VENN_BOT,
			triggerMessage: BOT_CONSTANTS.VENN_BOT.TEST.MESSAGE.HELLO,
			// Venn bot has multiple possible responses, so we just check for any response
			expectedResponsePattern: /.+/,
			channelId: channelIDs.NebulaChat
		});
	});

	// SigGreat-Bot
	describe('SigGreat-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.SIGGREAT_BOT,
			triggerMessage: BOT_CONSTANTS.SIGGREAT_BOT.TEST.MESSAGE.SIG_BEST,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.SIGGREAT_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});

	// Bot-Bot
	describe('Bot-Bot', () => {
		testBot({
			botName: BOT_NAMES_IN_DISCORD.BOT_BOT,
			triggerMessage: BOT_CONSTANTS.BOT_BOT.TEST.MESSAGE.BOT_IN_SENTENCE,
			expectedResponsePattern: createFlexiblePattern(BOT_CONSTANTS.BOT_BOT.RESPONSE),
			channelId: channelIDs.NebulaChat
		});
	});
});
