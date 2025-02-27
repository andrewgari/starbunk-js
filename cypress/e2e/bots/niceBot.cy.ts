/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Nice-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "69" with "nice"', () => {
		cy.sendDiscordMessage(
			'The answer is 69',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'69 is a funny number',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'My favorite number is 69',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" in the middle of a word', () => {
		cy.sendDiscordMessage(
			'The route69highway is closed',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "69" with other numbers', () => {
		cy.sendDiscordMessage(
			'The numbers are 42, 69, and 420',
			'Nice-Bot',
			/nice/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "69"', () => {
		cy.task('sendDiscordMessage', {
			message: 'The answer is 42',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect numbers', () => {
		cy.task('sendDiscordMessage', {
			message: 'The answer is 6 or 9',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
