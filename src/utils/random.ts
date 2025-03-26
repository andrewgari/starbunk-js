import { randomInt } from 'crypto';
import { isDebugMode } from '../environment';

export default {
	roll: (max: number) => {
		return Math.floor(Math.random() * max);
	},
	/**
	 * Returns true if a random percentage roll is less than the target percentage
	 * @param target The target percentage (0-100)
	 * @returns true if successful, false otherwise
	 *
	 * IMPORTANT: Always returns true (100% chance) when DEBUG mode is enabled,
	 * regardless of the target percentage provided.
	 */
	percentChance: (target: number) => {
		// Always return true in debug mode (100% chance)
		if (isDebugMode()) {
			return true;
		}
		const roll = randomInt(100);
		return roll < target;
	},
};

/**
 * Generate a random integer between min and max (inclusive)
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer
 */
export function integer(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns true with the given percent chance (0-100)
 * IMPORTANT: Always returns true (100% chance) when DEBUG is enabled,
 * to make testing more predictable
 * @param percent Percentage chance (0-100)
 * @returns True if random chance hit, false otherwise
 */
export function percentChance(percent: number): boolean {
	// In debug mode, always return true
	if (isDebugMode()) {
		return true;
	}

	// Normal random chance
	return Math.random() * 100 < percent;
}

/**
 * Returns a random element from an array
 * @param arr Array to select from
 * @returns Random element from the array
 */
export function randomElement<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}
