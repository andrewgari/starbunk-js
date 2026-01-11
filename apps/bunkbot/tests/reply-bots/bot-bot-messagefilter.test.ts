/**
 * DISABLED: BotBot is now disabled due to simplified bot detection.
 * Bot detection now only checks message.author.bot and skips all bot messages.
 */

import { Message } from 'discord.js';
import BotBot from '../../src/reply-bots/bot-bot';

// Mock message creation helper
const createMockMessage = (overrides: Partial<Message> = {}): Partial<Message> => ({
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

describe.skip('BotBot with new messageFilter system - DISABLED', () => {
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

	it('should still exclude CovaBot messages', async () => {
		// Create a CovaBot message
		const covaBotMessage = createMockMessage({
			content: 'Hello from CovaBot!',
			author: {
				id: '123456789',
				username: 'CovaBot',
				bot: true,
			},
		});

		// Mock Math.random to ensure we would respond if not excluded
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.005); // 0.5% - within 1% chance

		// Spy on channel.send to see if any message was sent
		const sendSpy = jest.spyOn(covaBotMessage.channel, 'send');

		try {
			// Process the message
			await BotBot.processMessage(covaBotMessage as Message);

			// Should not send any message because CovaBot is excluded
			expect(sendSpy).not.toHaveBeenCalled();
		} finally {
			Math.random = originalRandom;
		}
	});

	it('should exclude DJCova messages', async () => {
		// Create a DJCova message
		const djCovaMessage = createMockMessage({
			content: 'Hello from DJCova!',
			author: {
				id: '999888777',
				username: 'DJCova',
				bot: true,
			},
		});

		// Mock Math.random to ensure we would respond if not excluded
		const originalRandom = Math.random;
		Math.random = jest.fn(() => 0.005); // 0.5% - within 1% chance

		// Spy on channel.send to see if any message was sent
		const sendSpy = jest.spyOn(djCovaMessage.channel, 'send');

		try {
			// Process the message
			await BotBot.processMessage(djCovaMessage as Message);

			// Should not send any message because DJCova is excluded
			expect(sendSpy).not.toHaveBeenCalled();
		} finally {
			Math.random = originalRandom;
		}
	});
});
