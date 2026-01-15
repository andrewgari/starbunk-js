import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmEnemyStrategy } from '../../src/strategy/confirm-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('ConfirmEnemyStrategy', () => {
	const strategy = new ConfirmEnemyStrategy();
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
		test('responds to enemy user with mean words', async () => {
			const meanWords = ['fuck', 'fucking', 'hate', 'die', 'kill', 'worst', 'shit', 'murder', 'bot', 'bots'];
			for (const word of meanWords) {
				const message = createMockMessage(`I ${word} this`, enemyUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(true);
			}
		});

		test('responds to enemy user with confirmation words if no mean words (via super)', async () => {
			// Note: ConfirmEnemyStrategy checks for mean words first, then falls back to super
			// If there are no mean words, it calls super.shouldRespond which checks if user is enemy
			// and returns false. So enemy user with just confirmation words won't trigger this strategy.
			const message = createMockMessage('yes', enemyUserId);
			const result = await strategy.shouldRespond(message as Message);
			// This should be false because super.shouldRespond blocks enemy users
			expect(result).toBe(false);
		});

		test('does not respond to non-enemy user even with mean words', async () => {
			const meanWords = ['fuck', 'hate', 'die', 'kill'];
			for (const word of meanWords) {
				const message = createMockMessage(`I ${word} this`, friendUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(false);
			}
		});

		test('does not respond to enemy user without trigger words', async () => {
			const message = createMockMessage('Hello there', enemyUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});

		test('is case insensitive for mean words', async () => {
			const testCases = ['FUCK', 'Hate', 'DiE', 'KILL'];
			for (const content of testCases) {
				const message = createMockMessage(content, enemyUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(true);
			}
		});

		test('matches mean words with word boundaries', async () => {
			const message = createMockMessage('I hate this bot', enemyUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});
	});

	describe('getResponse', () => {
		test('returns Navy Seal copypasta', async () => {
			const response = await strategy.getResponse();

			expect(response).toContain('What the fuck did you just fucking say about me');
			expect(response).toContain('Blue Mages');
			expect(response).toContain('300 confirmed spells');
			expect(response).toContain('FFXIV');
			expect(response).toContain('Eorzea');
			expect(response).toContain('blue magic');
			expect(response).toContain('bare cane'); // It's "bare cane" not "blue cane"
		});

		test('returns same response regardless of trigger', async () => {
			// getResponse doesn't take a message parameter, always returns the same copypasta
			const response = await strategy.getResponse();
			const expectedStart = 'What the fuck did you just fucking say about me';
			expect(response).toContain(expectedStart);
		});
	});
});

