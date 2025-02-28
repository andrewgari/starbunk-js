/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Ezio-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "ezio" with a matching response', () => {
		cy.sendDiscordMessage(
			'Ezio is my favorite assassin',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "ezio" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Ezio Auditore da Firenze is from Assassin\'s Creed',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "ezio" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'My favorite character is Ezio',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "EZIO"', () => {
		cy.sendDiscordMessage(
			'EZIO AUDITORE DA FIRENZE',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "EzIo"', () => {
		cy.sendDiscordMessage(
			'EzIo is a master assassin',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "assassin" without mentioning Ezio', () => {
		cy.sendDiscordMessage(
			'The assassin crept through the shadows',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "assassin" in different forms (assassins, assassination)', () => {
		cy.sendDiscordMessage(
			'The assassins brotherhood is secretive',
			'Ezio-Bot',
			/assassin/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "ezio" or "assassin"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love Assassin\'s Creed games',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to assign someone to this task',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
