/// <reference types="cypress" />
import channelIDs from '../../../src/discord/channelIDs';

describe('Banana-Bot E2E Tests', () => {
	before(() => {
		// Initialize Discord client before running tests
		cy.initDiscordClient();
	});

	it('should respond to "banana" with a matching response', () => {
		cy.sendDiscordMessage(
			'I ate a banana for breakfast',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "banana" at the beginning of a sentence', () => {
		cy.sendDiscordMessage(
			'Banana splits are delicious',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "banana" at the end of a sentence', () => {
		cy.sendDiscordMessage(
			'My favorite fruit is banana',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to "banana" in the middle of a sentence', () => {
		cy.sendDiscordMessage(
			'I put banana slices in my cereal',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to uppercase "BANANA"', () => {
		cy.sendDiscordMessage(
			'BANANA BREAD IS AMAZING',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to mixed case "BaNaNa"', () => {
		cy.sendDiscordMessage(
			'BaNaNa pudding is tasty',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should respond to plural "bananas"', () => {
		cy.sendDiscordMessage(
			'I bought some bananas at the store',
			'Banana-Bot',
			/banana/i,
			channelIDs.NebulaChat
		);
	});

	it('should NOT respond to a message without "banana"', () => {
		cy.task('sendDiscordMessage', {
			message: 'I love apples',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});

	it('should NOT respond to similar but incorrect words', () => {
		cy.task('sendDiscordMessage', {
			message: 'I like bandanas',
			channelId: channelIDs.NebulaChat,
			expectResponse: false
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
