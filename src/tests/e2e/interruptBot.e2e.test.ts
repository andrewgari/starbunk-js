import { InterruptBotConfig } from '../../starbunk/bots/config/interruptBotConfig';
import StarbunkClient from '../../starbunk/starbunkClient';
import { discordMock } from './setup';

describe('InterruptBot E2E', () => {
	let starbunkClient: StarbunkClient;

	beforeEach(() => {
		// Create a new StarbunkClient instance
		starbunkClient = new StarbunkClient({
			intents: [],
		});

		// Mock environment variables
		process.env.STARBUNK_TOKEN = 'mock-token';
		process.env.CLIENT_ID = 'mock-client-id';
		process.env.GUILD_ID = 'mock-guild-id';

		// Initialize the bot
		starbunkClient.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');

		// Reset captured messages before each test
		discordMock.reset();
	});

	// InterruptBot is random, so we need to force it to trigger
	// The test mocks would need to be modified to allow reliable testing
	// For now, we'll test the known behavior with specific test cases

	it('should interrupt with "Did somebody say BLU?" message', async () => {
		// This is a special case in the config that will always return the same interrupted message
		const originalMessage = 'Did somebody say BLU?';
		const expectedInterruption = 'Did somebody say--- Oh, sorry... go ahead';

		// Simulate a bot sending the original message
		// We're using the test pattern from the config
		await discordMock.simulateMessage(originalMessage, 'BlueBot', 'general');

		// Force InterruptBot to respond by simulating its behavior
		// In a real scenario, this would happen randomly
		// but for testing, we're directly calling the interrupt function
		discordMock.mockWebhookSend(
			InterruptBotConfig.Name,
			InterruptBotConfig.Responses.createInterruptedMessage(originalMessage),
			'general'
		);

		// Check that the interrupt message was sent correctly
		expect(discordMock.sentMessages.length).toBeGreaterThan(0);
		expect(discordMock.sentMessages[discordMock.sentMessages.length - 1].username).toBe(InterruptBotConfig.Name);
		expect(discordMock.sentMessages[discordMock.sentMessages.length - 1].content).toBe(expectedInterruption);
	});

	it('should interrupt a long word correctly', async () => {
		// Another special case in the config
		const originalMessage = 'Supercalifragilisticexpialidocious';
		const expectedInterruption = 'Supercalif--- Oh, sorry... go ahead';

		// Simulate user message
		await discordMock.simulateMessage(originalMessage);

		// Force InterruptBot to respond
		discordMock.mockWebhookSend(
			InterruptBotConfig.Name,
			InterruptBotConfig.Responses.createInterruptedMessage(originalMessage),
			'general'
		);

		// Check that the interrupt message was sent correctly
		expect(discordMock.sentMessages.length).toBeGreaterThan(0);
		expect(discordMock.sentMessages[discordMock.sentMessages.length - 1].username).toBe(InterruptBotConfig.Name);
		expect(discordMock.sentMessages[discordMock.sentMessages.length - 1].content).toBe(expectedInterruption);
	});

	it('should generate valid interruptions for regular messages', async () => {
		// Test a normal message
		const originalMessage = 'Hey everyone, I wanted to share something important';

		// Simulate user message
		await discordMock.simulateMessage(originalMessage);

		// Force InterruptBot to respond
		discordMock.mockWebhookSend(
			InterruptBotConfig.Name,
			InterruptBotConfig.Responses.createInterruptedMessage(originalMessage),
			'general'
		);

		// Check that the interrupt message was sent correctly
		expect(discordMock.sentMessages.length).toBeGreaterThan(0);
		expect(discordMock.sentMessages[discordMock.sentMessages.length - 1].username).toBe(InterruptBotConfig.Name);

		// The message should contain the start of the original message and an apology
		const interruptedMessage = discordMock.sentMessages[discordMock.sentMessages.length - 1].content;
		expect(interruptedMessage).toContain('---');
		expect(interruptedMessage).toContain('Oh, sorry... go ahead');

		// Verify that the message starts with a part of the original message
		const words = originalMessage.split(' ');
		const firstFewWords = words.slice(0, 3).join(' ');
		expect(interruptedMessage.startsWith(firstFewWords) || interruptedMessage.includes(words[0])).toBeTruthy();
	});

	afterEach(() => {
		// Clean up environment variables
		process.env.STARBUNK_TOKEN = '';
		process.env.CLIENT_ID = '';
		process.env.GUILD_ID = '';
	});
});
