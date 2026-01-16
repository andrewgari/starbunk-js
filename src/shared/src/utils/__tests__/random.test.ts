import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as environment from '../../environment';
import { percentChance } from '../random';

describe('Random Utils', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		vi.spyOn(environment, 'isDebugMode').mockReturnValue(false);
		vi.spyOn(require('crypto'), 'randomInt').mockReturnValue(50);
	});

	describe('percentChance function', () => {
		test('returns true when random value is less than given percentage', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.3);
			expect(percentChance(40)).toBe(true); // 0.3 * 100 = 30, which is < 40
		});

		test('returns false when random value is greater than given percentage', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.7);
			expect(percentChance(60)).toBe(false); // 0.7 * 100 = 70, which is > 60
		});

		test('always returns true in debug mode', () => {
			vi.spyOn(environment, 'isDebugMode').mockReturnValue(true);
			expect(percentChance(0)).toBe(true); // Should be true even with 0% chance
		});
	});
});
