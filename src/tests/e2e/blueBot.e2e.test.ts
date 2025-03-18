import { BlueBotConfig } from '../../starbunk/bots/config/blueBotConfig';
import StarbunkClient from '../../starbunk/starbunkClient';
import { discordMock, expectBotResponse } from './setup';

// This is an end-to-end test for BlueBot
describe('BlueBot E2E', () => {
	let starbunkClient: StarbunkClient;

	beforeEach(() => {
		// Create a new StarbunkClient instance
		starbunkClient = new StarbunkClient({
			intents: [],
		});

		// Mock the token so we don't try to actually login to Discord
		process.env.STARBUNK_TOKEN = 'mock-token';
		process.env.CLIENT_ID = 'mock-client-id';
		process.env.GUILD_ID = 'mock-guild-id';

		// Initialize the bot
		starbunkClient.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');
	});

	it('should respond when a user mentions "blue"', async () => {
		// Simulate a user sending a message containing the word "blue"
		await discordMock.simulateMessage('I love the blue sky today!');

		// Check if BlueBot responded properly
		expectBotResponse(BlueBotConfig.Responses.Default, BlueBotConfig.Name);
	});

	it('should respond with a cheeky message when appropriate', async () => {
		// Send a specific message that would trigger the cheeky response
		await discordMock.simulateMessage('blue? definitely blue!');

		// Verify the cheeky response was sent
		expectBotResponse(BlueBotConfig.Responses.Cheeky, BlueBotConfig.Name);
	});

	it('should respond with nice things about a user when asked', async () => {
		// Send a message asking BlueBot to say something nice
		await discordMock.simulateMessage('bluebot, say something nice about John');

		// Verify that a nice response about John was sent
		expectBotResponse('Hey, I think you\'re pretty Blu!', BlueBotConfig.Name);
	});

	it('should respond with a different message for specific users', async () => {
		// Test the special case for Venn
		await discordMock.simulateMessage('bluebot, say something nice about Venn');

		// Verify the special response for Venn
		expectBotResponse('No way, Venn can suck my blu cane', BlueBotConfig.Name);
	});

	afterEach(() => {
		// Clean up environment variables
		delete process.env.STARBUNK_TOKEN;
		delete process.env.CLIENT_ID;
		delete process.env.GUILD_ID;
	});
});
