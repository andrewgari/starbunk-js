import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('BlueReplyStrategy', () => {
	let strategy: BlueReplyStrategy;
	const originalEnv = process.env.BLUEBOT_ENEMY_USER_ID;
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
		strategy = new BlueReplyStrategy();
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_ID = originalEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_ID;
		}
	});

  describe('Basic Tests', () => {
    test('should respond if someone says blue', async () => {
			let message = createMockMessage('blue', friendUserId);
			let result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);

      message = createMockMessage('i love the color blue', friendUserId);
			result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);

      message = createMockMessage('azul is another word for it', friendUserId);
			result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);

      message = createMockMessage('BluMage actually does not have an e in it', friendUserId);
			result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

    test('should not respond if someone does not say blue', async () => {
			const message = createMockMessage('hello world', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});
  });

	describe('Confirm Bot Tests', () => {
    test('blue message within time window should respond', async () => {
      const message = createMockMessage('blue', friendUserId);
      message.createdTimestamp = Date.now();

      await strategy.shouldRespond(message as Message);
      await strategy.getResponse(message as Message);

      // Advance time by 2 minutes (within 5 minute window)
      vi.advanceTimersByTime(2 * 60 * 1000);
      // The shouldRespond method should return true
      const result = await strategy.shouldRespond(message as Message);
      expect(result).toBe(true);
    });

    test('blue message outside of time window should not respond', async () => {
      const message = createMockMessage('blue', friendUserId);
      message.createdTimestamp = Date.now();

      await strategy.shouldRespond(message as Message);
      await strategy.getResponse(message as Message);

			vi.advanceTimersByTime(6 * 60 * 1000);
      const result2 = await strategy.shouldRespond(message as Message);
      expect(result2).toBe(false);
    });


	});

	describe('shouldRespond - outside reply window', () => {
		test('responds to "blue" when outside reply window', async () => {
			const message = createMockMessage('I love blue', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('does not respond to non-blue messages when outside reply window', async () => {
			const message = createMockMessage('hello world', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});
	});
});

