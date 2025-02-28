/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Chaos-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "chaos" with a matching response', () => {
		cy.sendDiscordMessage(
			'This is pure chaos',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "chaos" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Chaos is a ladder',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "chaos" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'This room is in chaos',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "CHAOS"', () => {
		cy.sendDiscordMessage(
			'CHAOS REIGNS',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "ChAoS"', () => {
		cy.sendDiscordMessage(
			'ChAoS theory is interesting',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "chaos" in different contexts', () => {
		cy.sendDiscordMessage(
			'The chaos emeralds are powerful',
			'Chaos-Bot',
			/chaos/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "chaos"', () => {
		cy.task('sendDiscordMessage', {
			message: 'Everything is in order',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I like chasing butterflies',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
