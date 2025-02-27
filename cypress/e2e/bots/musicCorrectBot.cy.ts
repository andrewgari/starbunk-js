/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Music-Correct-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "!play" with a correction message', () => {
		cy.sendDiscordMessage(
			'!play despacito',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "!play" with different songs', () => {
		cy.sendDiscordMessage(
			'!play never gonna give you up',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "!play" with no song specified', () => {
		cy.sendDiscordMessage(
			'!play',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "!play" with uppercase', () => {
		cy.sendDiscordMessage(
			'!PLAY some music',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "!play" with mixed case', () => {
		cy.sendDiscordMessage(
			'!PlAy a song',
			'Music-Correct-Bot',
			/Use \/play instead of !play/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to "/play" (correct command)', () => {
		cy.task('sendDiscordMessage', {
			message: '/play despacito',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to other commands', () => {
		cy.task('sendDiscordMessage', {
			message: '!skip',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to messages about playing without the command', () => {
		cy.task('sendDiscordMessage', {
			message: 'I want to play some music',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
