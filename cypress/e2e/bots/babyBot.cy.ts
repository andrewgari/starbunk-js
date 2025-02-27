/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Baby-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "baby" with a matching response', () => {
		cy.sendDiscordMessage(
			'Look at that cute baby',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "baby" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Baby shark doo doo doo',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "baby" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'She is just a baby',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "baby" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'That baby doll is creepy',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "BABY"', () => {
		cy.sendDiscordMessage(
			'BABY YODA IS CUTE',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "BaBy"', () => {
		cy.sendDiscordMessage(
			'BaBy steps are important',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "baby" as a term of endearment', () => {
		cy.sendDiscordMessage(
			'Hey baby, how are you?',
			'Baby-Bot',
			/baby/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "baby"', () => {
		cy.task('sendDiscordMessage', {
			message: 'Look at that cute kid',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to babysit tonight',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
