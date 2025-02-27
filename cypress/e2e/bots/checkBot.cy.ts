/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Check-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "check" with "czech"', () => {
		cy.sendDiscordMessage(
			'Let me check that for you',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "check" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Check this out',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "check" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I need to check',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "check" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'I will check it later',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "CHECK"', () => {
		cy.sendDiscordMessage(
			'CHECK THIS OUT',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "ChEcK"', () => {
		cy.sendDiscordMessage(
			'ChEcK this out',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to different forms of "check" (checking, checked)', () => {
		cy.sendDiscordMessage(
			'I am checking the status',
			'Check-Bot',
			/czech/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "check"', () => {
		cy.task('sendDiscordMessage', {
			message: 'Let me verify that for you',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to cheque my bank account',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
