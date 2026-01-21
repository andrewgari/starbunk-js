import { describe, test, expect } from 'vitest';
import { DefaultStrategy } from '../../src/strategy/blue-default-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';
import { expectShouldRespond, testMultipleCases, expectResponse } from '../helpers/test-utils';

describe('DefaultStrategy', () => {
	const strategy = new DefaultStrategy();

	describe('shouldRespond', () => {
		test('should respond to "blue"', async () => {
			await expectShouldRespond(strategy, 'I love blue', true);
		});

		test('should respond to "blu"', async () => {
			await expectShouldRespond(strategy, 'blu is great', true);
		});

		test('should respond to "blew"', async () => {
			await expectShouldRespond(strategy, 'The wind blew', true);
		});

		test('should respond to "azul" (Spanish)', async () => {
			await expectShouldRespond(strategy, 'Me gusta azul', true);
		});

		test('should respond to "blau" (German)', async () => {
			await expectShouldRespond(strategy, 'Ich mag blau', true);
		});

		test('should respond to "blooo" (extended o)', async () => {
			await expectShouldRespond(strategy, 'blooooo', true);
		});

		test('should respond to "bluuu" (extended u)', async () => {
			await expectShouldRespond(strategy, 'bluuuuu', true);
		});

		test('should be case insensitive', async () => {
			await testMultipleCases(strategy, ['BLUE', 'Blue', 'BLuE', 'bLuE'], true);
		});

		test('should match blue as a word boundary', async () => {
			await expectShouldRespond(strategy, 'The sky is blue today', true);
		});

		test('should not respond to messages without blue variations', async () => {
			await testMultipleCases(
				strategy,
				[
					'Hello world',
					'This is a test',
					'No color here',
					'Red and green',
					'blueberry', // Should not match - not a word boundary
				],
				false
			);
		});

		test('should not respond to empty message', async () => {
			await expectShouldRespond(strategy, '', false);
		});
	});

	describe('getResponse', () => {
		test('should return correct response', async () => {
			const message = createMockMessage({ content: 'blue' });
			await expectResponse(strategy, message as Message, 'Did somebody say Blu?');
		});

		test('should return same response regardless of message content', async () => {
			const testCases = ['blue', 'blu', 'azul'];

			for (const content of testCases) {
				const message = createMockMessage({ content });
				await expectResponse(strategy, message as Message, 'Did somebody say Blu?');
			}
		});
	});
});

