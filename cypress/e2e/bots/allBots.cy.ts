/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';
import { testBot, testBotNoResponse } from '../../support/botTestHelper';
import '../../support/index.d.ts';

/**
 * E2E tests for all bots in a single file
 *
 * This file tests all bots with their basic functionality using a simpler structure
 */
describe('All Bots E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Spider-Bot
	it('Spider-Bot should respond to "I love spiderman movies!"', () => {
		cy.sendDiscordMessage(
			'I love spiderman movies!',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	// Sheesh-Bot
	it('Sheesh-Bot should respond to "sheesh that was amazing"', () => {
		cy.sendDiscordMessage(
			'sheesh that was amazing',
			'Sheesh-Bot',
			/sh(e+)sh/i,
			channelIDs.NebulaChat
		);
	});

	// Pickle-Bot
	it('Pickle-Bot should respond to "I turned myself into a pickle"', () => {
		cy.sendDiscordMessage(
			'I turned myself into a pickle',
			'Pickle-Bot',
			/pickle/i,
			channelIDs.NebulaChat
		);
	});

	// Nice-Bot
	it('Nice-Bot should respond to "The answer is 69"', () => {
		cy.sendDiscordMessage(
			'The answer is 69',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	describe('Attitude-Bot', () => {
		testBot({
			botName: 'Attitude-Bot',
			triggerMessage: 'I can\'t do this',
			expectedResponsePattern: /Not with THAT attitude!!!/
		});

		testBotNoResponse('Attitude-Bot', 'I am unable to do that');
	});

	// Music-Correct-Bot
	it('Music-Correct-Bot should respond to "!play despacito"', () => {
		cy.sendDiscordMessage(
			'!play despacito',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	// Macaroni-Bot
	it('Macaroni-Bot should respond to "I love macaroni and cheese"', () => {
		cy.sendDiscordMessage(
			'I love macaroni and cheese',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	// Hold-Bot
	it('Hold-Bot should respond to "Please hold the door"', () => {
		cy.sendDiscordMessage(
			'Please hold the door',
			'Hold-Bot',
			/hold/i,
			channelIDs.NebulaChat
		);
	});

	// Gundam-Bot
	it('Gundam-Bot should respond to "I love gundam models"', () => {
		cy.sendDiscordMessage(
			'I love gundam models',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	// Check-Bot
	it('Check-Bot should respond to "Let me check that for you"', () => {
		cy.sendDiscordMessage(
			'Let me check that for you',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	// Chaos-Bot
	it('Chaos-Bot should respond to "This is pure chaos"', () => {
		cy.sendDiscordMessage(
			'This is pure chaos',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	// Baby-Bot
	it('Baby-Bot should respond to "Look at that cute baby"', () => {
		cy.sendDiscordMessage(
			'Look at that cute baby',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	// Banana-Bot
	it('Banana-Bot should respond to "I ate a banana for breakfast"', () => {
		cy.sendDiscordMessage(
			'I ate a banana for breakfast',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	// Guy-Bot
	it('Guy-Bot should respond to "That guy is cool"', () => {
		cy.sendDiscordMessage(
			'That guy is cool',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	// Ezio-Bot
	it('Ezio-Bot should respond to "Ezio is my favorite assassin"', () => {
		cy.sendDiscordMessage(
			'Ezio is my favorite assassin',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	// Blue-Bot
	it('Blue-Bot should respond to "The sky is blue today"', () => {
		cy.sendDiscordMessage(
			'The sky is blue today',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	// Venn-Bot
	it('Venn-Bot should respond to "Let me make a venn diagram"', () => {
		cy.sendDiscordMessage(
			'Let me make a venn diagram',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	// SigGreat-Bot
	it('SigGreat-Bot should respond to "Sig is the best"', () => {
		cy.sendDiscordMessage(
			'Sig is the best',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	// Bot-Bot
	it('Bot-Bot should respond to "This bot is cool"', () => {
		cy.sendDiscordMessage(
			'This bot is cool',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});
});
