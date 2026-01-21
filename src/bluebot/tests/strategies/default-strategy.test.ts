import { describe, test, expect } from 'vitest';
import { DefaultStrategy } from '../../src/strategy/default-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('DefaultStrategy', () => {
	const strategy = new DefaultStrategy();

	describe('shouldRespond', () => {
		test('should respond to "blue"', async () => {
			const message = createMockMessage('I love blue');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "blu"', async () => {
			const message = createMockMessage('blu is great');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "blew"', async () => {
			const message = createMockMessage('The wind blew');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "azul" (Spanish)', async () => {
			const message = createMockMessage('Me gusta azul');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "blau" (German)', async () => {
			const message = createMockMessage('Ich mag blau');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "blooo" (extended o)', async () => {
			const message = createMockMessage('blooooo');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should respond to "bluuu" (extended u)', async () => {
			const message = createMockMessage('bluuuuu');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should be case insensitive', async () => {
			const testCases = ['BLUE', 'Blue', 'BLuE', 'bLuE'];
			for (const content of testCases) {
				const message = createMockMessage(content);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(true);
			}
		});

		test('should match blue as a word boundary', async () => {
			const message = createMockMessage('The sky is blue today');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(true);
		});

		test('should not respond to messages without blue variations', async () => {
			const testCases = [
				'Hello world',
				'This is a test',
				'No color here',
				'Red and green',
				'blueberry', // Should not match - not a word boundary
			];

			for (const content of testCases) {
				const message = createMockMessage(content);
				const result = await strategy.shouldRespond(message as Message);
				expect(result).toBe(false);
			}
		});

		test('should not respond to empty message', async () => {
			const message = createMockMessage('');
			const result = await strategy.shouldRespond(message as Message);
			expect(result).toBe(false);
		});
	});

	describe('getResponse', () => {
		test('should return correct response', async () => {
			const message = createMockMessage('blue');
			const response = await strategy.getResponse(message as Message);
			expect(response).toBe('Did somebody say Blu?');
		});

		test('should return same response regardless of message content', async () => {
			const messages = [
				createMockMessage('blue'),
				createMockMessage('blu'),
				createMockMessage('azul'),
			];

			for (const message of messages) {
				const response = await strategy.getResponse(message as Message);
				expect(response).toBe('Did somebody say Blu?');
			}
		});
	});
});

