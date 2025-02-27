/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Guy-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "guy" with a matching response', () => {
		cy.sendDiscordMessage(
			'That guy is cool',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "guy" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Guy Fieri has great hair',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "guy" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'He seems like a nice guy',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "guy" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'The guy in the red shirt is tall',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "GUY"', () => {
		cy.sendDiscordMessage(
			'GUY RITCHIE DIRECTED THAT MOVIE',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "GuY"', () => {
		cy.sendDiscordMessage(
			'GuY Fawkes Night is in November',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to plural "guys"', () => {
		cy.sendDiscordMessage(
			'Hey guys, what\'s up?',
			'Guy-Bot',
			/guy/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "guy"', () => {
		cy.task('sendDiscordMessage', {
			message: 'That man is cool',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to buy something',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
