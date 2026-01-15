import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmStrategy } from '../../src/strategy/confirm-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('ConfirmStrategy', () => {
	const strategy = new ConfirmStrategy();
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

	describe('shouldRespond', () => {
		test('responds to "yes"', async () => {
			const message = createMockMessage('yes', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "no"', async () => {
			const message = createMockMessage('no', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "yep"', async () => {
			const message = createMockMessage('yep', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "yeah"', async () => {
			const message = createMockMessage('yeah', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "nope"', async () => {
			const message = createMockMessage('nope', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "nah"', async () => {
			const message = createMockMessage('nah', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "bot"', async () => {
			const message = createMockMessage('bot', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "bluebot"', async () => {
			const message = createMockMessage('bluebot', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "i did"', async () => {
			const message = createMockMessage('i did', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "i did not"', async () => {
			const message = createMockMessage('i did not', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "you got it"', async () => {
			const message = createMockMessage('you got it', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "sure did"', async () => {
			const message = createMockMessage('sure did', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('is case insensitive', async () => {
			const testCases = ['YES', 'Yes', 'YeS', 'NO', 'No'];
			for (const content of testCases) {
				const message = createMockMessage(content, friendUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(true);
			}
		});

		test('does not respond to enemy user', async () => {
			const testCases = ['yes', 'no', 'bot', 'bluebot'];
			for (const content of testCases) {
				const message = createMockMessage(content, enemyUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(false);
			}
		});

		test('does not respond to unrelated messages', async () => {
			const testCases = [
				'Hello world',
				'This is a test',
				'Random message',
			];

			for (const content of testCases) {
				const message = createMockMessage(content, friendUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(false);
			}
		});

		test('does not respond to empty message', async () => {
			const message = createMockMessage('', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});
	});

	describe('getResponse', () => {
		test('returns "Yes"', async () => {
			const response = await strategy.getResponse();
			expect(response).toBe('Yes');
		});

		test('returns same response regardless of trigger', async () => {
			// getResponse doesn't take a message parameter, always returns "Yes"
			const response = await strategy.getResponse();
			expect(response).toBe('Yes');
		});
	});
});

