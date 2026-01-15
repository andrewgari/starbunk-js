import { describe, test, expect, beforeEach } from 'vitest';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('BlueReplyStrategy', () => {
	let strategy: BlueReplyStrategy;

	beforeEach(() => {
		strategy = new BlueReplyStrategy();
	});

	describe('shouldRespond', () => {
		test('responds to "blue" when more than 5 minutes have passed', async () => {
			// Set lastBlueResponse to 6 minutes ago
			const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
			const message = createMockMessage('I love blue');
			(message as any).createdTimestamp = sixMinutesAgo + 6 * 60 * 1000; // current time

			// Manually set lastBlueResponse to 6 minutes ago
			(strategy as any).lastBlueResponse = new Date(sixMinutesAgo);

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds with confirm strategy when less than 5 minutes have passed and message contains confirm word', async () => {
			// Set lastBlueResponse to 2 minutes ago
			const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
			const message = createMockMessage('yes');
			(message as any).createdTimestamp = twoMinutesAgo + 2 * 60 * 1000; // current time

			// Manually set lastBlueResponse to 2 minutes ago
			(strategy as any).lastBlueResponse = new Date(twoMinutesAgo);

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true); // ConfirmStrategy should respond to "yes"
		});

		test('does not respond when less than 5 minutes have passed and message does not match confirm or blue', async () => {
			// Set lastBlueResponse to 2 minutes ago
			const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
			const message = createMockMessage('hello world');
			(message as any).createdTimestamp = twoMinutesAgo + 2 * 60 * 1000; // current time

			// Manually set lastBlueResponse to 2 minutes ago
			(strategy as any).lastBlueResponse = new Date(twoMinutesAgo);

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});

		test('responds to "blue" exactly at 5 minutes', async () => {
			// Set lastBlueResponse to exactly 5 minutes ago
			const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
			const message = createMockMessage('blue');
			(message as any).createdTimestamp = fiveMinutesAgo + 5 * 60 * 1000; // current time

			// Manually set lastBlueResponse to 5 minutes ago
			(strategy as any).lastBlueResponse = new Date(fiveMinutesAgo);

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('responds to "blue" via ConfirmStrategy when less than 5 minutes have passed', async () => {
			// Set lastBlueResponse to 4 minutes ago
			const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
			const message = createMockMessage('blue');
			(message as any).createdTimestamp = fourMinutesAgo + 4 * 60 * 1000; // current time

			// Manually set lastBlueResponse to 4 minutes ago
			(strategy as any).lastBlueResponse = new Date(fourMinutesAgo);

			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true); // Should use ConfirmStrategy which matches "blue" too
		});
	});

	describe('getResponse', () => {
		test('returns "Yes" and updates lastBlueResponse', async () => {
			const message = createMockMessage('blue');
			const beforeResponse = (strategy as any).lastBlueResponse.getTime();

			// Wait a tiny bit to ensure time difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			const response = await strategy.getResponse(message as Message);
			const afterResponse = (strategy as any).lastBlueResponse.getTime();

			expect(response).toBe('Yes');
			expect(afterResponse).toBeGreaterThanOrEqual(beforeResponse);
		});
	});
});
