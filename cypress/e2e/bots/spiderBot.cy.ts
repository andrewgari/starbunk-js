/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Spider-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "spiderman" with a correction message', () => {
		cy.sendDiscordMessage(
			'I love spiderman movies!',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spiderman" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Spiderman is my favorite superhero',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spiderman" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'I dressed up as spiderman',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "SPIDERMAN"', () => {
		cy.sendDiscordMessage(
			'SPIDERMAN IS AWESOME',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "SpIdErMaN"', () => {
		cy.sendDiscordMessage(
			'SpIdErMaN has cool powers',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spider man" with a correction message', () => {
		cy.sendDiscordMessage(
			'spider man is my favorite superhero',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "spider man" with different spacing', () => {
		cy.sendDiscordMessage(
			'I love spider  man comics',
			'Spider-Bot',
			/Hey, it's "\*\*Spider-Man\*\*"! Don't forget the hyphen! Not Spiderman, that's dumb/,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to "Spider-Man" (correct hyphenation)', () => {
		cy.task('sendDiscordMessage', {
			message: 'Spider-Man is awesome!',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to messages without "spiderman" or "spider man"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love superheroes',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
