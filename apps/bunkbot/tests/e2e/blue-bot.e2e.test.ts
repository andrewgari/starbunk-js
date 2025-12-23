import { Events, Message } from 'discord.js';
import { FakeDiscordEnvironment } from '@starbunk/shared';
import { triggerBlueBotMention } from '../../src/reply-bots/blue-bot/triggers';

/**
 * E2E Test for BlueBot
 * Tests the complete flow: user message → bot processing → bot response
 */
describe('BlueBot E2E', () => {
	let env: FakeDiscordEnvironment;
	const TEST_USER = 'TestUser';
	const TEST_CHANNEL = 'general';

	// Helper to wait for async message processing
	const waitForProcessing = () => new Promise(resolve => setTimeout(resolve, 50));

	beforeEach(async () => {
		env = new FakeDiscordEnvironment({
			botUserId: 'bunkbot-123',
			botUsername: 'BunkBot',
			logToConsole: true,
		});
		await env.initialize();

		// Create reusable test fixtures
		const guild = env.createGuild('Test Server');
		env.createChannel(TEST_CHANNEL, guild);
		env.createUser(TEST_USER);

		// Set up BlueBot trigger to listen to messages
		env.client.on(Events.MessageCreate, async (message: Message) => {
			// Skip bot's own messages
			if (message.author.bot) return;

			// Check if the trigger matches
			const shouldRespond = await triggerBlueBotMention.condition(message);

			if (shouldRespond) {
				// Get the response
				const response = await triggerBlueBotMention.response(message);

				// Get the identity
				const identity = typeof triggerBlueBotMention.identity === 'function'
					? await triggerBlueBotMention.identity(message)
					: triggerBlueBotMention.identity;

				// Capture the bot's response
				env.captureBotMessage(
					(message.channel as any).name,
					response,
					identity?.botName || 'BluBot'
				);
			}
		});
	});

	afterEach(async () => {
		await env.destroy();
	});

	it('should respond when user says "blue"', async () => {
		await env.sendUserMessage(TEST_USER, TEST_CHANNEL, 'blue');
		await waitForProcessing();

		const botMessages = env.getBotResponses(TEST_CHANNEL);
		expect(botMessages).toHaveLength(1);
		expect(botMessages[0].content).toBe('Did somebody say Blu?');
		expect(botMessages[0].username).toBe('BluBot');
	});

	it('should NOT respond when user says "buttcheeks"', async () => {
		await env.sendUserMessage(TEST_USER, TEST_CHANNEL, 'buttcheeks');
		await waitForProcessing();

		const botMessages = env.getBotResponses(TEST_CHANNEL);
		expect(botMessages).toHaveLength(0);
	});

	it('should respond to variations of "blue"', async () => {
		// Test "blu"
		await env.sendUserMessage(TEST_USER, TEST_CHANNEL, 'blu');
		await waitForProcessing();

		let botMessages = env.getBotResponses(TEST_CHANNEL);
		expect(botMessages).toHaveLength(1);
		expect(botMessages[0].content).toBe('Did somebody say Blu?');

		env.messageCapture.clear();

		// Test "BLUE" (uppercase)
		await env.sendUserMessage(TEST_USER, TEST_CHANNEL, 'BLUE');
		await waitForProcessing();

		botMessages = env.getBotResponses(TEST_CHANNEL);
		expect(botMessages).toHaveLength(1);
		expect(botMessages[0].content).toBe('Did somebody say Blu?');

		env.messageCapture.clear();

		// Test "blue" in a sentence
		await env.sendUserMessage(TEST_USER, TEST_CHANNEL, 'I love the color blue');
		await waitForProcessing();

		botMessages = env.getBotResponses(TEST_CHANNEL);
		expect(botMessages).toHaveLength(1);
		expect(botMessages[0].content).toBe('Did somebody say Blu?');
	});
});

