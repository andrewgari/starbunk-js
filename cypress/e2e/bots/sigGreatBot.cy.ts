/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('SigGreat-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "sig" with a matching response', () => {
		cy.sendDiscordMessage(
			'Sig is the best',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "sig" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Sig rocks at gaming',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "sig" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'The best player is sig',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "sig" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'I think sig is awesome',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "SIG"', () => {
		cy.sendDiscordMessage(
			'SIG IS THE GREATEST',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "SiG"', () => {
		cy.sendDiscordMessage(
			'SiG is a legend',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "sig" as part of a username', () => {
		cy.sendDiscordMessage(
			'SigMaster5000 just joined the server',
			'SigGreat-Bot',
			/sig/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "sig"', () => {
		cy.task('sendDiscordMessage', {
			message: 'Who is the best player?',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to sign this document',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
