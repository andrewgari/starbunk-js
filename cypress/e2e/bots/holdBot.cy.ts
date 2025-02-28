/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Hold-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "hold" with a matching response', () => {
		cy.sendDiscordMessage(
			'Please hold the door',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "hold" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Hold on to your seats',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "hold" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'This is something to hold',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "hold" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'I will hold it for you',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "HOLD"', () => {
		cy.sendDiscordMessage(
			'HOLD THE LINE',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "HoLd"', () => {
		cy.sendDiscordMessage(
			'HoLd your horses',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to different forms of "hold" (holding, holds)', () => {
		cy.sendDiscordMessage(
			'I am holding it for you',
			'Hold-Bot',
			/hold the door/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "hold"', () => {
		cy.task('sendDiscordMessage', {
			message: 'Please close the door',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to fold the laundry',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
