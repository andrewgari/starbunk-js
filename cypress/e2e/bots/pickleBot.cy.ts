/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Pickle-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "pickle" with a Rick and Morty reference', () => {
		cy.sendDiscordMessage(
			'I turned myself into a pickle',
			'Pickle-Bot',
			/I turned myself into a pickle, Morty!/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "pickle" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Pickle Rick is the best character',
			'Pickle-Bot',
			/I turned myself into a pickle, Morty!/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "pickle" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I want to eat a pickle',
			'Pickle-Bot',
			/I turned myself into a pickle, Morty!/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "PICKLE"', () => {
		cy.sendDiscordMessage(
			'PICKLE RICK!',
			'Pickle-Bot',
			/I turned myself into a pickle, Morty!/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "PiCkLe"', () => {
		cy.sendDiscordMessage(
			'PiCkLe juice is sour',
			'Pickle-Bot',
			/I turned myself into a pickle, Morty!/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "pickle"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love Rick and Morty',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to pick something up',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
