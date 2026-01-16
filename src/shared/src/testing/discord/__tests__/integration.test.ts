import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Events, Message } from 'discord.js';
import { FakeDiscordEnvironment } from '../fake-discord-environments';

/**
 * Integration test: Simulates a realistic bot scenario
 * This tests the full flow: user message → bot event handler → bot response → message capture
 */
describe('FakeDiscordEnvironment - Integration Test', () => {
	let env: FakeDiscordEnvironment;

	beforeEach(async () => {
		env = new FakeDiscordEnvironment({
			botUserId: 'test-bot-123',
			botUsername: 'TestBot',
			logToConsole: true, // Enable to see the console output
		});
		await env.initialize();
	});

	afterEach(async () => {
		await env.destroy();
	});

	it('should simulate a complete bot interaction flow', async () => {
		// Setup: Create Discord environment
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		const user = env.createUser('Alice');

		console.log('\n=== Starting Integration Test ===\n');

		// Setup: Create a simple bot that responds to messages
		let botReceivedMessage = false;
		let receivedMessageContent = '';

		env.client.on(Events.MessageCreate, async (message: Message) => {
			console.log(`[Bot Event Handler] Received message: "${message.content}" from ${message.author.username}`);

			// Skip bot's own messages
			if (message.author.bot) {
				console.log('[Bot Event Handler] Skipping bot message');
				return;
			}

			botReceivedMessage = true;
			receivedMessageContent = message.content;

			// Bot responds
			const response = `Hello ${message.author.username}! You said: "${message.content}"`;
			console.log(`[Bot Event Handler] Sending response: "${response}"`);

			// Simulate bot sending a message via webhook
			env.captureBotMessage((message.channel as any).name, response, 'TestBot');
		});

		// Act: User sends a message
		console.log('\n--- User sends message ---');
		await env.sendUserMessage('Alice', 'general', 'Hello bot!');

		// Wait a bit for async event handlers
		await new Promise((resolve) => setTimeout(resolve, 50));

		console.log('\n--- Checking results ---');

		// Assert: Bot received the message
		expect(botReceivedMessage).toBe(true);
		expect(receivedMessageContent).toBe('Hello bot!');
		console.log('✓ Bot received the message');

		// Assert: User message was captured
		const userMessages = env.getUserMessages('general');
		expect(userMessages).toHaveLength(1);
		expect(userMessages[0].content).toBe('Hello bot!');
		expect(userMessages[0].username).toBe('Alice');
		expect(userMessages[0].isBot).toBe(false);
		console.log('✓ User message was captured');

		// Assert: Bot response was captured
		const botMessages = env.getBotResponses('general');
		expect(botMessages).toHaveLength(1);
		expect(botMessages[0].content).toBe('Hello Alice! You said: "Hello bot!"');
		expect(botMessages[0].username).toBe('TestBot');
		expect(botMessages[0].isBot).toBe(true);
		console.log('✓ Bot response was captured');

		// Assert: All messages in order
		const allMessages = env.messageCapture.getMessagesChronological();
		expect(allMessages).toHaveLength(2);
		expect(allMessages[0].content).toBe('Hello bot!'); // User message first
		expect(allMessages[1].content).toBe('Hello Alice! You said: "Hello bot!"'); // Bot response second
		console.log('✓ Messages are in correct chronological order');

		console.log('\n=== Integration Test Complete ===\n');
	});

	it('should handle multiple users and messages', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		env.createUser('Alice');
		env.createUser('Bob');

		console.log('\n=== Multi-User Test ===\n');

		// Simple echo bot
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;

			const response = `Echo: ${message.content}`;
			env.captureBotMessage((message.channel as any).name, response);
		});

		// Multiple users send messages
		await env.sendUserMessage('Alice', 'general', 'First message');
		await env.sendUserMessage('Bob', 'general', 'Second message');
		await env.sendUserMessage('Alice', 'general', 'Third message');

		await new Promise((resolve) => setTimeout(resolve, 50));

		// Verify
		const userMessages = env.getUserMessages('general');
		expect(userMessages).toHaveLength(3);

		const botMessages = env.getBotResponses('general');
		expect(botMessages).toHaveLength(3);

		const allMessages = env.messageCapture.getMessagesChronological();
		expect(allMessages).toHaveLength(6); // 3 user + 3 bot

		console.log('✓ Multi-user conversation handled correctly');
		console.log(`  - ${userMessages.length} user messages`);
		console.log(`  - ${botMessages.length} bot responses`);
		console.log('\n=== Multi-User Test Complete ===\n');
	});

	it('should handle bot that only responds to specific messages', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		env.createUser('Alice');

		console.log('\n=== Selective Response Test ===\n');

		// Bot only responds to messages containing "hello"
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;

			if (message.content.toLowerCase().includes('hello')) {
				env.captureBotMessage((message.channel as any).name, 'Hi there!');
			}
			// Otherwise, bot stays silent
		});

		await env.sendUserMessage('Alice', 'general', 'hello bot');
		await env.sendUserMessage('Alice', 'general', 'goodbye');
		await env.sendUserMessage('Alice', 'general', 'Hello again!');

		await new Promise((resolve) => setTimeout(resolve, 50));

		const userMessages = env.getUserMessages('general');
		expect(userMessages).toHaveLength(3);

		const botMessages = env.getBotResponses('general');
		expect(botMessages).toHaveLength(2); // Only responded to 2 messages with "hello"

		console.log('✓ Bot correctly responded only to matching messages');
		console.log(`  - ${userMessages.length} user messages`);
		console.log(`  - ${botMessages.length} bot responses (selective)`);
		console.log('\n=== Selective Response Test Complete ===\n');
	});
});
