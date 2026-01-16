import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NiceStrategy } from '../../src/strategy/nice-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('NiceStrategy', () => {
	const strategy = new NiceStrategy();
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
		test('responds to "bluebot say something nice about John"', async () => {
			const message = createMockMessage('bluebot say something nice about John', friendUserId);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
			expect(await strategy.getResponse(message as Message)).toBe("John, I think you're pretty blue! :wink:");
		});

		test('responds to "bluebot say something nice about me"', async () => {
			// Note: The regex requires "blue?bot" so just "bot" won't match
			const message = createMockMessage(
				'bluebot say something nice about me',
				friendUserId,
				false,
				'999999999999999999',
				'robot',
			);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
			expect(await strategy.getResponse(message as Message)).toBe("Hey robot, I think you're pretty blue! :wink:");
		});

		test('is case insensitive', async () => {
			const testCases = [
				'BLUEBOT SAY SOMETHING NICE ABOUT JOHN',
				'BlueBot Say Something Nice About Jane',
				'bluebot say something nice about bob',
			];

			for (const content of testCases) {
				const message = createMockMessage(content, friendUserId);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(true);
			}
		});

		test('does not respond to messages without "say something nice about"', async () => {
			const testCases = ['bluebot hello', 'say something nice', 'bluebot say hello', 'tell me about John'];

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
		test('returns generic nice message for non-mention', async () => {
			const message = createMockMessage('bluebot say something nice about John', friendUserId);
			const response = await strategy.getResponse(message as Message);
			expect(response).toContain("I think you're pretty blue!");
			expect(response).toContain(':wink:');
		});

		test('includes name in response for non-mention', async () => {
			const message = createMockMessage('bluebot say something nice about someone', friendUserId);
			const response = await strategy.getResponse(message as Message);
			expect(response).toBe("someone, I think you're pretty blue! :wink:");
		});

		test('handles user mentions', async () => {
			const mentionedUserId = '123456789012345678';
			const message = createMockMessage(`bluebot say something nice about <@${mentionedUserId}>`, friendUserId);
			const response = await strategy.getResponse(message as Message);
			expect(response).toContain("I think you're pretty blue!");
		});

		test('response always contains blue reference', async () => {
			const testCases = [
				'bluebot say something nice about John',
				'bot say something nice about Jane',
				'bluebot, say something nice about Bob',
			];

			for (const content of testCases) {
				const message = createMockMessage(content, friendUserId);
				const response = await strategy.getResponse(message as Message);
				expect(response).toContain('blue');
			}
		});
	});
});
