import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Events } from 'discord.js';
import { FakeDiscordEnvironment } from '../fake-discord-environments';

describe('FakeDiscordEnvironment', () => {
	let env: FakeDiscordEnvironment;

	beforeEach(async () => {
		env = new FakeDiscordEnvironment({
			botUserId: 'test-bot-123',
			botUsername: 'TestBot',
			logToConsole: false, // Disable console logging in tests
		});
		await env.initialize();
	});

	afterEach(async () => {
		await env.destroy();
	});

	describe('initialization', () => {
		it('should initialize the client and set bot user', async () => {
			expect(env.client.isReady).toBe(true);
			expect(env.client.user).toBeDefined();
			expect(env.client.user?.id).toBe('test-bot-123');
			expect(env.client.user?.username).toBe('TestBot');
		});

		it('should emit ClientReady event on login', async () => {
			const newEnv = new FakeDiscordEnvironment();
			const readyHandler = vi.fn();

			const readyPromise = new Promise<void>((resolve) => {
				newEnv.client.once(Events.ClientReady, () => {
					readyHandler();
					resolve();
				});
			});

			await newEnv.initialize();
			await readyPromise;

			expect(readyHandler).toHaveBeenCalled();
			await newEnv.destroy();
		});
	});

	describe('user management', () => {
		it('should create and retrieve users', () => {
			const user = env.createUser('Alice');

			expect(user.username).toBe('Alice');
			expect(user.bot).toBe(false);

			const retrieved = env.getUser('Alice');
			expect(retrieved).toBe(user);
		});

		it('should be case-insensitive when retrieving users', () => {
			const user = env.createUser('Alice');

			expect(env.getUser('alice')).toBe(user);
			expect(env.getUser('ALICE')).toBe(user);
		});
	});

	describe('guild and channel management', () => {
		it('should create guilds and channels', () => {
			const guild = env.createGuild('Test Server');
			const channel = env.createChannel('general', guild);

			expect(guild.name).toBe('Test Server');
			expect(channel.name).toBe('general');
			expect(channel.guild).toBe(guild);
		});

		it('should retrieve guilds and channels by name', () => {
			const guild = env.createGuild('Test Server');
			const channel = env.createChannel('general', guild);

			expect(env.getGuild('Test Server')).toBe(guild);
			expect(env.getChannel('general')).toBe(channel);
		});
	});

	describe('message simulation', () => {
		it('should send user messages and trigger MessageCreate event', async () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);
			env.createUser('Alice');

			const messageHandler = vi.fn();
			env.client.on(Events.MessageCreate, messageHandler);

			await env.sendUserMessage('Alice', 'general', 'Hello world!');

			expect(messageHandler).toHaveBeenCalled();
			const message = messageHandler.mock.calls[0][0];
			expect(message.content).toBe('Hello world!');
			expect(message.author.username).toBe('Alice');
			expect(message.channel.name).toBe('general');
		});

		it('should capture user messages', async () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);
			env.createUser('Alice');

			await env.sendUserMessage('Alice', 'general', 'Hello world!');

			const messages = env.getUserMessages('general');
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe('Hello world!');
			expect(messages[0].username).toBe('Alice');
			expect(messages[0].isBot).toBe(false);
		});

		it('should throw error if user does not exist', async () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);

			await expect(env.sendUserMessage('NonExistent', 'general', 'Hello')).rejects.toThrow(
				'User "NonExistent" not found',
			);
		});

		it('should throw error if channel does not exist', async () => {
			env.createUser('Alice');

			await expect(env.sendUserMessage('Alice', 'nonexistent', 'Hello')).rejects.toThrow(
				'Channel "nonexistent" not found',
			);
		});
	});

	describe('bot message capture', () => {
		it('should capture bot messages', () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);

			env.captureBotMessage('general', 'Bot response here');

			const botMessages = env.getBotResponses('general');
			expect(botMessages).toHaveLength(1);
			expect(botMessages[0].content).toBe('Bot response here');
			expect(botMessages[0].isBot).toBe(true);
			expect(botMessages[0].username).toBe('TestBot');
		});

		it('should support custom bot names', () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);

			env.captureBotMessage('general', 'Custom bot response', 'CustomBot');

			const botMessages = env.getBotResponses('general');
			expect(botMessages[0].username).toBe('CustomBot');
		});
	});

	describe('message capture queries', () => {
		beforeEach(async () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);
			env.createUser('Alice');
			env.createUser('Bob');

			await env.sendUserMessage('Alice', 'general', 'Hello from Alice');
			env.captureBotMessage('general', 'Bot response 1');
			await env.sendUserMessage('Bob', 'general', 'Hello from Bob');
			env.captureBotMessage('general', 'Bot response 2');
		});

		it('should get all messages', () => {
			const allMessages = env.messageCapture.getAllMessages();
			expect(allMessages).toHaveLength(4);
		});

		it('should get bot messages only', () => {
			const botMessages = env.messageCapture.getBotMessages();
			expect(botMessages).toHaveLength(2);
			expect(botMessages.every((msg) => msg.isBot)).toBe(true);
		});

		it('should get user messages only', () => {
			const userMessages = env.messageCapture.getUserMessages();
			expect(userMessages).toHaveLength(2);
			expect(userMessages.every((msg) => !msg.isBot)).toBe(true);
		});

		it('should get last bot message', () => {
			const lastBot = env.messageCapture.getLastBotMessage();
			expect(lastBot?.content).toBe('Bot response 2');
		});

		it('should find messages by content', () => {
			const aliceMessages = env.messageCapture.findMessagesByContent('Alice');
			expect(aliceMessages).toHaveLength(1);
			expect(aliceMessages[0].username).toBe('Alice');
		});

		it('should find messages by regex', () => {
			const botMessages = env.messageCapture.findMessagesByContent(/Bot response/);
			expect(botMessages).toHaveLength(2);
		});

		it('should clear messages', () => {
			env.clearMessages();
			expect(env.messageCapture.getMessageCount()).toBe(0);
		});
	});

	describe('cleanup', () => {
		it('should clean up all resources on destroy', async () => {
			const guild = env.createGuild('Test Server');
			env.createChannel('general', guild);
			env.createUser('Alice');

			await env.sendUserMessage('Alice', 'general', 'Test message');

			await env.destroy();

			expect(env.client.isReady).toBe(false);
			expect(env.messageCapture.getMessageCount()).toBe(0);
		});
	});
});
