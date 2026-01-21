import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfirmStrategy } from '../../src/strategy/confirm-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel } from 'discord.js';
import { processMessageByStrategy } from '../../src/strategy/strategy-router';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';

describe('ConfirmStrategy', () => {
	let strategy = new ConfirmStrategy();

	beforeEach(() => {
		strategy = new ConfirmStrategy();
	});

	test('should acknowledge when somebody confirms that they said blue', async () => {
		const testCases = [
      'yes',
      'yep',
      'yeah',
      'no',
      'nope',
      'nah',
			'Yes, I did bluebot.',
			'No, I did not bluebot.',
			'You got it bluebot!',
			'When did I say blue?',
		];

		for (const content of testCases) {
			const message = createMockMessage(content);
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		}
	});
});
