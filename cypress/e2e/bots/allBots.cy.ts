/// <reference types="cypress" />
import { testBot, testBotNoResponse } from '../../support/botTestHelper';

describe('All Bots E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	// Test each bot with its trigger pattern and expected response

	describe('Spider-Bot', () => {
		testBot({
			botName: 'Spider-Bot',
			triggerMessage: 'I love spiderman movies!',
			expectedResponsePattern: /Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/
		});

		testBotNoResponse('Spider-Bot', 'Spider-Man is awesome!');
	});

	describe('Sheesh-Bot', () => {
		testBot({
			botName: 'Sheesh-Bot',
			triggerMessage: 'sheesh that was amazing',
			expectedResponsePattern: /sh(e+)sh/i
		});
	});

	describe('Pickle-Bot', () => {
		testBot({
			botName: 'Pickle-Bot',
			triggerMessage: 'I turned myself into a pickle',
			expectedResponsePattern: /pickle/i
		});
	});

	describe('Nice-Bot', () => {
		testBot({
			botName: 'Nice-Bot',
			triggerMessage: 'The answer is 69',
			expectedResponsePattern: /nice/i
		});
	});

	describe('Music-Correct-Bot', () => {
		testBot({
			botName: 'Music-Correct-Bot',
			triggerMessage: '!play despacito',
			expectedResponsePattern: /Use \/play instead of !play/i
		});
	});

	describe('Macaroni-Bot', () => {
		testBot({
			botName: 'Macaroni-Bot',
			triggerMessage: 'I love macaroni and cheese',
			expectedResponsePattern: /macaroni/i
		});
	});

	describe('Hold-Bot', () => {
		testBot({
			botName: 'Hold-Bot',
			triggerMessage: 'Please hold the door',
			expectedResponsePattern: /hold/i
		});
	});

	describe('Gundam-Bot', () => {
		testBot({
			botName: 'Gundam-Bot',
			triggerMessage: 'I love gundam models',
			expectedResponsePattern: /gundam/i
		});
	});

	describe('Check-Bot', () => {
		testBot({
			botName: 'Check-Bot',
			triggerMessage: 'Let me check that for you',
			expectedResponsePattern: /czech/i
		});
	});

	describe('Chaos-Bot', () => {
		testBot({
			botName: 'Chaos-Bot',
			triggerMessage: 'This is pure chaos',
			expectedResponsePattern: /chaos/i
		});
	});

	describe('Baby-Bot', () => {
		testBot({
			botName: 'Baby-Bot',
			triggerMessage: 'Look at that cute baby',
			expectedResponsePattern: /baby/i
		});
	});

	describe('Banana-Bot', () => {
		testBot({
			botName: 'Banana-Bot',
			triggerMessage: 'I ate a banana for breakfast',
			expectedResponsePattern: /banana/i
		});
	});

	describe('Guy-Bot', () => {
		testBot({
			botName: 'Guy-Bot',
			triggerMessage: 'That guy is cool',
			expectedResponsePattern: /guy/i
		});
	});

	describe('Ezio-Bot', () => {
		testBot({
			botName: 'Ezio-Bot',
			triggerMessage: 'Ezio is my favorite assassin',
			expectedResponsePattern: /assassin/i
		});
	});

	describe('Blue-Bot', () => {
		testBot({
			botName: 'Blue-Bot',
			triggerMessage: 'The sky is blue today',
			expectedResponsePattern: /blue/i
		});
	});

	describe('Venn-Bot', () => {
		testBot({
			botName: 'Venn-Bot',
			triggerMessage: 'Let me make a venn diagram',
			expectedResponsePattern: /venn/i
		});
	});

	describe('SigGreat-Bot', () => {
		testBot({
			botName: 'SigGreat-Bot',
			triggerMessage: 'Sig is the best',
			expectedResponsePattern: /sig/i
		});
	});

	describe('Bot-Bot', () => {
		testBot({
			botName: 'Bot-Bot',
			triggerMessage: 'This bot is cool',
			expectedResponsePattern: /bot/i
		});
	});
});
