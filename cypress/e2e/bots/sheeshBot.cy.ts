/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Sheesh-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to lowercase "sheesh" with a matching response', () => {
		cy.sendDiscordMessage(
			'sheesh that was amazing',
			'Sheesh-Bot',
			/sh(e+)sh/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "SHEESH" with a matching response', () => {
		cy.sendDiscordMessage(
			'SHEESH what a play!',
			'Sheesh-Bot',
			/sh(e+)sh/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "ShEeSh" with a matching response', () => {
		cy.sendDiscordMessage(
			'ShEeSh that was close',
			'Sheesh-Bot',
			/sh(e+)sh/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "sheesh" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'I was like sheesh when I saw that',
			'Sheesh-Bot',
			/sh(e+)sh/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "sheesh"', () => {
		cy.task('sendDiscordMessage', {
			message: 'That was amazing!',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need a sheet for my bed',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
