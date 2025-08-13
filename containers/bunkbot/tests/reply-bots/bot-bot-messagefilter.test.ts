import { Message } from 'discord.js';
import BotBot from '../../src/reply-bots/bot-bot';

// Mock message creation helper
import { Message } from 'discord.js';

// Mock message creation helper
const createMockMessage = (
  overrides: Partial<Message> = {}
): Partial<Message> => ({
  content: 'test message',
  author: {
    id: '123456789',
    username: 'testuser',
    bot: false,
  } as any, // Type assertion needed for mock
  channel: {
    id: 'channel123',
    send: jest.fn().mockResolvedValue({}),
  } as any, // Type assertion needed for mock
  guild: {
    id: 'guild123',
  } as any, // Type assertion needed for mock
  ...overrides,
});

describe('BotBot with new messageFilter system', () => {

	it('should skip non-bot messages (inverted logic)', async () => {
		// Create a human message
		const humanMessage = createMockMessage({
			content: 'Hello from a human!',
			author: {
				id: '123456789',
				username: 'human_user',
				bot: false,
			},
		});

		// Mock Math.random to ensure we would normally respond (if it weren't filtered out)
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.005); // 0.5% - well within 1% chance

		// Spy on channel.send to see if any message was sent
		const sendSpy = jest.spyOn(humanMessage.channel, 'send');

		try {
			// Process the message
			await BotBot.processMessage(humanMessage as Message);

			// Should not send any message because it's from a human (inverted logic)
			expect(sendSpy).not.toHaveBeenCalled();
		} finally {
			Math.random = originalRandom;
		}
	});

	it('should process bot messages with 1% chance', async () => {
		// Create a bot message (not from CovaBot or excluded bots)
		const botMessage = createMockMessage({
			content: 'Hello from another bot!',
			author: {
				id: '987654321',
				username: 'other_bot',
				bot: true,
			},
		});

		// Mock Math.random to hit the 1% chance
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.005); // 0.5% - within 1% chance

		// Spy on channel.send to see if any message was sent
		const sendSpy = jest.spyOn(botMessage.channel, 'send');

		try {
			// Process the message
			await BotBot.processMessage(botMessage as Message);

			// Should send a message because it's from a bot and hit the 1% chance
			expect(sendSpy).toHaveBeenCalledWith('Hello fellow bot!');
		} finally {
			Math.random = originalRandom;
		}
	});

	it('should skip bot messages that miss the 1% chance', async () => {
		// Create a bot message (not from CovaBot or excluded bots)
		const botMessage = createMockMessage({
			content: 'Hello from another bot!',
			author: {
				id: '987654321',
				username: 'other_bot',
				bot: true,
			},
		});

		// Mock Math.random to miss the 1% chance
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.5); // 50% - well above 1% chance

		// Spy on channel.send to see if any message was sent
		const sendSpy = jest.spyOn(botMessage.channel, 'send');

		try {
			// Process the message
			await BotBot.processMessage(botMessage as Message);

			// Should not send any message because it missed the 1% chance
			expect(sendSpy).not.toHaveBeenCalled();
		} finally {
			Math.random = originalRandom;
		}
	});

	it.skip('should process CovaBot messages with 1% chance (no longer excluded)', async () => {
		// Create a CovaBot message
		const covaBotMessage = createMockMessage({
			content: 'Hello from CovaBot!',
			author: {
				id: '123456789',
				username: 'CovaBot',
				bot: true,
			},
		});

		// Mock Math.random to ensure we would respond (within 1% chance)
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.005); // 0.5% - within 1% chance

		try {
			// Test if the bot should respond - it should return true for CovaBot with favorable chance
			const shouldRespond = await BotBot.shouldRespond(covaBotMessage as Message);

			// Should now respond to CovaBot messages with favorable chance (no longer excluded)
			expect(shouldRespond).toBe(true);
		} finally {
			Math.random = originalRandom;
		}
	});
});