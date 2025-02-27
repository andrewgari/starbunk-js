/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Blue-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "blue" with a matching response', () => {
		cy.sendDiscordMessage(
			'The sky is blue today',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "blue" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Blue is my favorite color',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "blue" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'My car is blue',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "blue" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'The blue whale is the largest animal',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "BLUE"', () => {
		cy.sendDiscordMessage(
			'BLUE SKIES AHEAD',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "BlUe"', () => {
		cy.sendDiscordMessage(
			'BlUe jeans are classic',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "blue" in compound words', () => {
		cy.sendDiscordMessage(
			'I love blueberries',
			'Blue-Bot',
			/blue/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "blue"', () => {
		cy.task('sendDiscordMessage', {
			message: 'The sky is clear today',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I feel a bit glum today',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
