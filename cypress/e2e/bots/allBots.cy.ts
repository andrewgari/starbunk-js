/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

/**
 * E2E tests for all bots in a single file
 *
 * This file tests all bots with their basic functionality
 */
describe('All Bots E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Spider-Bot
	describe('Spider-Bot', () => {
		testBot({
			botName: 'Spider-Bot',
			triggerMessage: 'I love spiderman movies!',
			expectedResponsePattern: /Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelId: channelIDs.NebulaChat
		});

		testBotNoResponse('Spider-Bot', 'Spider-Man is awesome!', channelIDs.NebulaChat);
	});

	// Sheesh-Bot
	describe('Sheesh-Bot', () => {
		testBot({
			botName: 'Sheesh-Bot',
			triggerMessage: 'sheesh that was amazing',
			expectedResponsePattern: /sh(e+)sh/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Pickle-Bot
	describe('Pickle-Bot', () => {
		testBot({
			botName: 'Pickle-Bot',
			triggerMessage: 'I turned myself into a pickle',
			expectedResponsePattern: /pickle/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Nice-Bot
	describe('Nice-Bot', () => {
		testBot({
			botName: 'Nice-Bot',
			triggerMessage: 'The answer is 69',
			expectedResponsePattern: /nice/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Attitude-Bot
	describe('Attitude-Bot', () => {
		testBot({
			botName: 'Attitude-Bot',
			triggerMessage: 'I can\'t do this',
			expectedResponsePattern: /Not with THAT attitude!!!/,
			channelId: channelIDs.NebulaChat
		});

		testBotNoResponse('Attitude-Bot', 'I am unable to do that', channelIDs.NebulaChat);
	});

	// Music-Correct-Bot
	describe('Music-Correct-Bot', () => {
		testBot({
			botName: 'Music-Correct-Bot',
			triggerMessage: '!play despacito',
			expectedResponsePattern: /Use \/play instead of !play/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Macaroni-Bot
	describe('Macaroni-Bot', () => {
		testBot({
			botName: 'Macaroni-Bot',
			triggerMessage: 'I love macaroni and cheese',
			expectedResponsePattern: /macaroni/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Hold-Bot
	describe('Hold-Bot', () => {
		testBot({
			botName: 'Hold-Bot',
			triggerMessage: 'Please hold the door',
			expectedResponsePattern: /hold/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Gundam-Bot
	describe('Gundam-Bot', () => {
		testBot({
			botName: 'Gundam-Bot',
			triggerMessage: 'I love gundam models',
			expectedResponsePattern: /gundam/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Check-Bot
	describe('Check-Bot', () => {
		testBot({
			botName: 'Check-Bot',
			triggerMessage: 'Let me check that for you',
			expectedResponsePattern: /czech/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Chaos-Bot
	describe('Chaos-Bot', () => {
		testBot({
			botName: 'Chaos-Bot',
			triggerMessage: 'This is pure chaos',
			expectedResponsePattern: /chaos/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Baby-Bot
	describe('Baby-Bot', () => {
		testBot({
			botName: 'Baby-Bot',
			triggerMessage: 'Look at that cute baby',
			expectedResponsePattern: /baby/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Banana-Bot
	describe('Banana-Bot', () => {
		testBot({
			botName: 'Banana-Bot',
			triggerMessage: 'I ate a banana for breakfast',
			expectedResponsePattern: /banana/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Guy-Bot
	describe('Guy-Bot', () => {
		testBot({
			botName: 'Guy-Bot',
			triggerMessage: 'That guy is cool',
			expectedResponsePattern: /guy/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Ezio-Bot
	describe('Ezio-Bot', () => {
		testBot({
			botName: 'Ezio-Bot',
			triggerMessage: 'Ezio is my favorite assassin',
			expectedResponsePattern: /assassin/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Blue-Bot
	describe('Blue-Bot', () => {
		testBot({
			botName: 'Blue-Bot',
			triggerMessage: 'The sky is blue today',
			expectedResponsePattern: /blue/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Venn-Bot
	describe('Venn-Bot', () => {
		testBot({
			botName: 'Venn-Bot',
			triggerMessage: 'Let me make a venn diagram',
			expectedResponsePattern: /venn/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// SigGreat-Bot
	describe('SigGreat-Bot', () => {
		testBot({
			botName: 'SigGreat-Bot',
			triggerMessage: 'Sig is the best',
			expectedResponsePattern: /sig/i,
			channelId: channelIDs.NebulaChat
		});
	});

	// Bot-Bot
	describe('Bot-Bot', () => {
		testBot({
			botName: 'Bot-Bot',
			triggerMessage: 'This bot is cool',
			expectedResponsePattern: /bot/i,
			channelId: channelIDs.NebulaChat
		});
	});
});
