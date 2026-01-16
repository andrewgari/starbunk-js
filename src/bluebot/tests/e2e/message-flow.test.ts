import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { processMessageByStrategy } from '../../src/strategy/strategy-router';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel } from 'discord.js';

describe('E2E: Message Flow', () => {
	const originalEnv = process.env.BLUEBOT_ENEMY_USER_ID;
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';

	beforeEach(() => {
		process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_ID = originalEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_ID;
		}
	});

	describe('Basic Blue Detection Flow', () => {
		test('should respond to "blue" with default response', async () => {
			const message = createMockMessage('I love blue', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			expect(sendSpy).toHaveBeenCalledTimes(1);
		});

		test('should respond to variations of blue', async () => {
			const variations = ['blu', 'azul', 'blau', 'blew'];

			for (const word of variations) {
				const message = createMockMessage(`I like ${word}`, friendUserId);
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should not respond to messages without blue', async () => {
			const message = createMockMessage('Hello world', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).not.toHaveBeenCalled();
		});
	});

	describe('Nice Request Flow', () => {
		test('should respond to "bluebot say something nice about" request', async () => {
			const message = createMockMessage('bluebot say something nice about Alice', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			expect(response).toContain('Alice');
		});

		test('should handle "blubot" variation', async () => {
			const message = createMockMessage('blubot say something nice about Bob', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			expect(response).toContain('Bob');
		});
	});

	describe('Enemy User Flow', () => {
		test('enemy user saying "blue" gets default response', async () => {
			// Enemy user saying "blue" should still get the default response
			const message = createMockMessage('I love blue', enemyUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
		});
	});

	describe('No Response Scenarios', () => {
		test('should not respond to empty messages', async () => {
			const message = createMockMessage('', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).not.toHaveBeenCalled();
		});

		test('should not respond to unrelated messages', async () => {
			const unrelatedMessages = [
				'Hello everyone',
				'How are you doing?',
				'What a nice day',
				'Testing 123',
			];

			for (const content of unrelatedMessages) {
				const message = createMockMessage(content, friendUserId);
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).not.toHaveBeenCalled();
			}
		});
	});

	describe('Strategy Priority', () => {
		test('nice request should take priority over blue detection', async () => {
			// Message contains both "blue" and a nice request
			const message = createMockMessage('bluebot say something nice about blue things', friendUserId);
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should get nice response, not "Did somebody say Blu?"
			expect(response).not.toBe('Did somebody say Blu?');
			expect(response).toContain('blue things');
		});
	});

	describe('Conversation Flows', () => {
		test('should handle multiple blue messages in sequence', async () => {
			// First message
			const message1 = createMockMessage('I love blue', friendUserId);
			const sendSpy1 = vi.fn();
			(message1.channel as TextChannel).send = sendSpy1;

			await processMessageByStrategy(message1 as Message);
			expect(sendSpy1).toHaveBeenCalledWith('Did somebody say Blu?');

			// Second message
			const message2 = createMockMessage('blue is the best color', friendUserId);
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			expect(sendSpy2).toHaveBeenCalledWith('Did somebody say Blu?');
		});

		test('should handle mixed message types in sequence', async () => {
			// Blue message
			const message1 = createMockMessage('blue is great', friendUserId);
			const sendSpy1 = vi.fn();
			(message1.channel as TextChannel).send = sendSpy1;

			await processMessageByStrategy(message1 as Message);
			expect(sendSpy1).toHaveBeenCalledWith('Did somebody say Blu?');

			// Nice request
			const message2 = createMockMessage('bluebot say something nice about Charlie', friendUserId);
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			expect(sendSpy2).toHaveBeenCalledTimes(1);
			const response = sendSpy2.mock.calls[0][0];
			expect(response).toContain('Charlie');

			// Unrelated message
			const message3 = createMockMessage('hello world', friendUserId);
			const sendSpy3 = vi.fn();
			(message3.channel as TextChannel).send = sendSpy3;

			await processMessageByStrategy(message3 as Message);
			expect(sendSpy3).not.toHaveBeenCalled();
		});
	});

	describe('Edge Cases', () => {
		test('should handle blue in different cases', async () => {
			const cases = ['BLUE', 'Blue', 'BLuE', 'bLuE'];

			for (const word of cases) {
				const message = createMockMessage(`I like ${word}`, friendUserId);
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should handle blue with punctuation', async () => {
			const messages = [
				'blue!',
				'blue?',
				'blue.',
				'blue,',
				'(blue)',
				'blue...',
			];

			for (const content of messages) {
				const message = createMockMessage(content, friendUserId);
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should not respond to blue as part of another word', async () => {
			const messages = [
				'blueberry',
				'bluetooth',
				'blueprint',
			];

			for (const content of messages) {
				const message = createMockMessage(content, friendUserId);
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				// The regex uses word boundaries, so these compound words don't match
				expect(sendSpy).not.toHaveBeenCalled();
			}
		});
	});
});

