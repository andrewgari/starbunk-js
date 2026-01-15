import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmEnemyStrategy } from '../../src/strategy/confirm-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';
import { vi } from 'vitest';
import { beforeAll, afterAll } from 'vitest';

describe('ConfirmEnemyStrategy', () => {
	const strategy = new ConfirmEnemyStrategy();
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
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_ID = originalEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_ID;
		}
	});

	describe('shouldRespond', () => {
    let message: Partial<Message>;

    beforeEach(async () => {
      vi.setSystemTime(Date.now());
      message = createMockMessage('murder', enemyUserId);
      message.createdTimestamp = Date.now();
    });

    test('blue message from enemy should respond', async () => {
      message.author = { id: enemyUserId } as any;
      const result = await strategy.shouldRespond(message as Message);
      expect(result).toBe(true);
    });

    test('blue message from friend should not respond', async () => {
      message.author = { id: friendUserId } as any;
      const result = await strategy.shouldRespond(message as Message);
      expect(result).toBe(false);
    });
	});
});
