/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Bot-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "bot" with a matching response', () => {
		cy.sendDiscordMessage(
			'This bot is cool',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "bot" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Bot commands are useful',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "bot" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I made a new bot',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "bot" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'The bot commands are helpful',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "BOT"', () => {
		cy.sendDiscordMessage(
			'BOT COMMANDS ARE GREAT',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "BoT"', () => {
		cy.sendDiscordMessage(
			'BoT features are cool',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to plural "bots"', () => {
		cy.sendDiscordMessage(
			'These bots are amazing',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "bot" as part of a compound word', () => {
		cy.sendDiscordMessage(
			'I love chatbots',
			'Bot-Bot',
			/bot/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "bot"', () => {
		cy.task('sendDiscordMessage', {
			message: 'This program is cool',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I bought a new computer',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
