import random from '@/utils/random';
import { randomInt } from 'crypto';

jest.mock('crypto', () => ({
	randomInt: jest.fn()
}));

describe('Random Utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset Math.random mock
		const mockMath = Object.create(global.Math);
		mockMath.random = () => 0.5;
		global.Math = mockMath;
	});

	describe('roll', () => {
		it('should return a number between 0 and max-1', () => {
			const result = random.roll(100);
			expect(result).toBe(50); // With mocked Math.random = 0.5
		});

		it('should handle small numbers', () => {
			const result = random.roll(2);
			expect(result).toBe(1);
		});
	});

	describe('percentChance', () => {
		it('should return true when roll is less than target', () => {
			(randomInt as jest.Mock).mockReturnValue(40);
			expect(random.percentChance(50)).toBe(true);
		});

		it('should return false when roll is greater than target', () => {
			(randomInt as jest.Mock).mockReturnValue(60);
			expect(random.percentChance(50)).toBe(false);
		});

		it('should return false when roll equals target', () => {
			(randomInt as jest.Mock).mockReturnValue(50);
			expect(random.percentChance(50)).toBe(false);
		});
	});
});
