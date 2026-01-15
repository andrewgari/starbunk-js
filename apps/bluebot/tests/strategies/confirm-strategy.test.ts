import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmStrategy } from '../../src/strategy/confirm-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('ConfirmStrategy', () => {
	const strategy = new ConfirmStrategy();
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';

	describe('shouldRespond', () => {
		test('does not respond to enemy user', async () => {
			const message = createMockMessage('yes', enemyUserId);
			message.author = { id: enemyUserId } as any;

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});

		test('does not respond to "hello world"', async () => {
			const message = createMockMessage('hello world', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});

    test('responds to "yes"', async () => {
			const message = createMockMessage('yes', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});
	});
});
