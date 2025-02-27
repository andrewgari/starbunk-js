/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Macaroni-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "macaroni" with a matching response', () => {
		cy.sendDiscordMessage(
			'I love macaroni and cheese',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "macaroni" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Macaroni is my favorite pasta',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "macaroni" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I want to eat some macaroni',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "MACARONI"', () => {
		cy.sendDiscordMessage(
			'MACARONI AND CHEESE IS THE BEST',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "MaCaRoNi"', () => {
		cy.sendDiscordMessage(
			'MaCaRoNi art is fun',
			'Macaroni-Bot',
			/macaroni/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "macaroni"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love pasta',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I like marconi radio',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
