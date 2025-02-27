/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Venn-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "venn" with a matching response', () => {
		cy.sendDiscordMessage(
			'Let me make a venn diagram',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "venn" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Venn diagrams show relationships',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "venn" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'This could be explained with a venn',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "venn" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'A venn diagram would help here',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "VENN"', () => {
		cy.sendDiscordMessage(
			'VENN DIAGRAMS ARE USEFUL',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "VeNn"', () => {
		cy.sendDiscordMessage(
			'VeNn diagrams show overlaps',
			'Venn-Bot',
			/venn/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "venn"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I need to make a diagram',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'When will you be here?',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
