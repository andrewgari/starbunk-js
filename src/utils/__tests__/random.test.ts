import random, { integer, percentChance, randomElement } from '../random';
import * as environment from '../../environment';

describe('Random Utils', () => {
	// Mock Math.random and environment.isDebugMode
	const originalRandom = Math.random;
	const originalRandomInt = require('crypto').randomInt;
  
	beforeEach(() => {
		jest.spyOn(Math, 'random').mockReturnValue(0.5);
		jest.spyOn(environment, 'isDebugMode').mockReturnValue(false);
		jest.spyOn(require('crypto'), 'randomInt').mockReturnValue(50);
	});
  
	afterEach(() => {
		jest.restoreAllMocks();
		Math.random = originalRandom;
		require('crypto').randomInt = originalRandomInt;
	});

	describe('default export', () => {
		test('roll returns a random integer between 0 and max-1', () => {
			expect(random.roll(10)).toBe(5); // 0.5 * 10 = 5
		});

		test('percentChance returns true when roll is less than target', () => {
			// Mock randomInt to return 30 (below the 50% threshold)
			jest.spyOn(require('crypto'), 'randomInt').mockReturnValue(30);
			expect(random.percentChance(50)).toBe(true);
		});

		test('percentChance returns false when roll is greater than or equal to target', () => {
			// Mock randomInt to return 60 (above the 50% threshold)
			jest.spyOn(require('crypto'), 'randomInt').mockReturnValue(60);
			expect(random.percentChance(50)).toBe(false);
		});

		test('percentChance always returns true in debug mode', () => {
			jest.spyOn(environment, 'isDebugMode').mockReturnValue(true);
			expect(random.percentChance(0)).toBe(true); // Should be true even with 0% chance
		});
	});

	describe('integer function', () => {
		test('returns a random integer between min and max (inclusive)', () => {
			expect(integer(1, 10)).toBe(6); // 0.5 * (10 - 1 + 1) + 1 = 6
		});

		test('handles single value range (min equals max)', () => {
			expect(integer(5, 5)).toBe(5);
		});
	});

	describe('percentChance function', () => {
		test('returns true when random value is less than given percentage', () => {
			jest.spyOn(Math, 'random').mockReturnValue(0.3);
			expect(percentChance(40)).toBe(true); // 0.3 * 100 = 30, which is < 40
		});

		test('returns false when random value is greater than given percentage', () => {
			jest.spyOn(Math, 'random').mockReturnValue(0.7);
			expect(percentChance(60)).toBe(false); // 0.7 * 100 = 70, which is > 60
		});

		test('always returns true in debug mode', () => {
			jest.spyOn(environment, 'isDebugMode').mockReturnValue(true);
			expect(percentChance(0)).toBe(true); // Should be true even with 0% chance
		});
	});

	describe('randomElement function', () => {
		test('returns a random element from an array', () => {
			const array = [10, 20, 30, 40, 50];
			// With Math.random mocked to 0.5, we expect the middle element
			// Math.floor(0.5 * 5) = 2, so index 2
			expect(randomElement(array)).toBe(30);
		});

		test('handles single element arrays', () => {
			const array = [42];
			expect(randomElement(array)).toBe(42);
		});
	});
});