import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NiceEnemyStrategy } from '../../src/strategy/nice-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('NiceEnemyStrategy', () => {
	const strategy = new NiceEnemyStrategy();
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';

	describe('shouldRespond', () => {
    test('enemy user should not respond', async () => {
      const message = createMockMessage('bluebot say something nice about John', enemyUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
    });
  });

	describe('getResponse', () => {
		test('returns mean response for enemy user', async () => {
			const message = createMockMessage('bluebot say something nice about John', enemyUserId);
			const response = await strategy.getResponse(message as Message);
			expect(response).toBe('No way, they can suck my blue cane :unamused:');
		});

		test('rejects for non-enemy user', async () => {
			const message = createMockMessage('bluebot say something nice about John', friendUserId);
			await expect(strategy.getResponse(message as Message)).rejects.toBe('');
		});

		test('response contains blue cane reference for enemy', async () => {
			const message = createMockMessage('bluebot say something nice about someone', enemyUserId);
			const response = await strategy.getResponse(message as Message);
			expect(response).toContain('blue cane');
		});

		test('response is consistently mean for enemy user', async () => {
			const testCases = [
				'bluebot say something nice about John',
				'bot say something nice about Jane',
				'bluebot, say something nice about Bob',
			];

			for (const content of testCases) {
				const message = createMockMessage(content, enemyUserId);
				const response = await strategy.getResponse(message as Message);
				expect(response).toBe('No way, they can suck my blue cane :unamused:');
			}
		});
	});
});

