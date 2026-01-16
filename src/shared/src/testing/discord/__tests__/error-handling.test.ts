import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Events, Message } from 'discord.js';
import { FakeDiscordEnvironment } from '../fake-discord-environments';

/**
 * Error Handling Tests: Verify that errors are properly reported
 * These tests intentionally cause errors to ensure we get clear error messages
 */
describe('FakeDiscordEnvironment - Error Handling', () => {
	let env: FakeDiscordEnvironment;

	beforeEach(async () => {
		env = new FakeDiscordEnvironment({
			botUserId: 'test-bot-123',
			botUsername: 'TestBot',
			logToConsole: true,
		});
		await env.initialize();
	});

	afterEach(async () => {
		await env.destroy();
	});

	it('should throw clear error when sending message as non-existent user', async () => {
		const guild = env.createGuild('Test Server');
		env.createChannel('general', guild);

		console.log('\n=== Testing Non-Existent User Error ===\n');

		await expect(env.sendUserMessage('NonExistentUser', 'general', 'Hello')).rejects.toThrow(
			'User "NonExistentUser" not found',
		);

		console.log('✓ Got expected error for non-existent user\n');
	});

	it('should throw clear error when sending message to non-existent channel', async () => {
		const guild = env.createGuild('Test Server');
		env.createChannel('general', guild);
		env.createUser('Alice');

		console.log('\n=== Testing Non-Existent Channel Error ===\n');

		await expect(env.sendUserMessage('Alice', 'non-existent-channel', 'Hello')).rejects.toThrow(
			'Channel "non-existent-channel" not found',
		);

		console.log('✓ Got expected error for non-existent channel\n');
	});

	it('should capture and report errors thrown in bot event handlers', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		const user = env.createUser('Alice');

		console.log('\n=== Testing Bot Event Handler Error ===\n');

		const errorMessages: Error[] = [];

		// Listen for errors
		env.client.on(Events.Error, (error: Error) => {
			console.log(`[Error Event] Caught error: ${error.message}`);
			errorMessages.push(error);
		});

		// Bot that throws an error
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;

			console.log('[Bot] Processing message...');
			throw new Error('Bot crashed while processing message!');
		});

		// Send a message that will trigger the error
		await env.sendUserMessage('Alice', 'general', 'Hello');

		// Wait for async error handling
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Verify error was captured
		expect(errorMessages.length).toBeGreaterThan(0);
		expect(errorMessages[0].message).toContain('Bot crashed while processing message!');

		console.log('✓ Bot error was captured and reported\n');
	});

	it('should show clear assertion failures when bot does not respond', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		const user = env.createUser('Alice');

		console.log('\n=== Testing Missing Bot Response ===\n');

		// Bot that never responds (silent bot)
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;
			console.log('[Bot] Received message but not responding');
			// Bot does nothing - no response
		});

		await env.sendUserMessage('Alice', 'general', 'Hello bot!');
		await new Promise((resolve) => setTimeout(resolve, 50));

		// This should fail with a clear message
		const botMessages = env.getBotResponses('general');
		console.log(`Bot messages captured: ${botMessages.length}`);

		expect(botMessages).toHaveLength(0); // Bot didn't respond

		// In a real test, this would fail:
		// expect(botMessages).toHaveLength(1); // Expected 1, got 0
		// Error: expect(received).toHaveLength(expected)
		// Expected length: 1
		// Received length: 0
		// Received array:  []

		console.log('✓ Can detect when bot fails to respond\n');
	});

	it('should show clear assertion failures when bot response is wrong', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		const user = env.createUser('Alice');

		console.log('\n=== Testing Wrong Bot Response ===\n');

		// Bot that responds with wrong message
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;
			env.captureBotMessage((message.channel as any).name, 'Wrong response!');
		});

		await env.sendUserMessage('Alice', 'general', 'Hello bot!');
		await new Promise((resolve) => setTimeout(resolve, 50));

		const botMessages = env.getBotResponses('general');
		console.log(`Bot response: "${botMessages[0].content}"`);

		expect(botMessages[0].content).toBe('Wrong response!');

		// In a real test, this would fail:
		// expect(botMessages[0].content).toBe('Expected response');
		// Error: expect(received).toBe(expected)
		// Expected: "Expected response"
		// Received: "Wrong response!"

		console.log('✓ Can detect when bot response is incorrect\n');
	});

	it('should help debug message order issues', async () => {
		const guild = env.createGuild('Test Server');
		const channel = env.createChannel('general', guild);
		env.createUser('Alice');
		env.createUser('Bob');

		console.log('\n=== Testing Message Order Debugging ===\n');

		// Simple echo bot
		env.client.on(Events.MessageCreate, async (message: Message) => {
			if (message.author.bot) return;
			env.captureBotMessage((message.channel as any).name, `Echo: ${message.content}`);
		});

		await env.sendUserMessage('Alice', 'general', 'First');
		await env.sendUserMessage('Bob', 'general', 'Second');
		await env.sendUserMessage('Alice', 'general', 'Third');
		await new Promise((resolve) => setTimeout(resolve, 50));

		const allMessages = env.messageCapture.getMessagesChronological();

		console.log('\nAll messages in order:');
		allMessages.forEach((msg, i) => {
			console.log(`  ${i + 1}. [${msg.isBot ? 'BOT' : 'USER'}] ${msg.username}: ${msg.content}`);
		});

		// Verify order
		expect(allMessages[0].content).toBe('First');
		expect(allMessages[1].content).toBe('Echo: First');
		expect(allMessages[2].content).toBe('Second');
		expect(allMessages[3].content).toBe('Echo: Second');
		expect(allMessages[4].content).toBe('Third');
		expect(allMessages[5].content).toBe('Echo: Third');

		console.log('\n✓ Message order is clear and debuggable\n');
	});
});
