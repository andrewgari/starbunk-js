/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Gundam-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "gundam" with a matching response', () => {
		cy.sendDiscordMessage(
			'I love gundam models',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "gundam" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Gundam Wing is my favorite series',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "gundam" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I just built a new gundam',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "GUNDAM"', () => {
		cy.sendDiscordMessage(
			'GUNDAM MODELS ARE AWESOME',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "GuNdAm"', () => {
		cy.sendDiscordMessage(
			'GuNdAm is cool',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "gundam" with specific series names', () => {
		cy.sendDiscordMessage(
			'Gundam Unicorn has great animation',
			'Gundam-Bot',
			/gundam/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "gundam"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love anime',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I like gundanium alloy',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
