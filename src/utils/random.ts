import { randomInt } from 'crypto';

export default {
	roll: (max: number) => {
		return Math.floor(Math.random() * max);
	},
	/**
	 * Returns true if a random percentage roll is less than the target percentage
	 * @param target The target percentage (0-100)
	 * @returns true if successful, false otherwise
	 *
	 * IMPORTANT: Always returns true (100% chance) when DEBUG_MODE is enabled,
	 * regardless of the target percentage provided.
	 */
	percentChance: (target: number) => {
		// Always return true in debug mode (100% chance)
		if (process.env.DEBUG_MODE === 'true') {
			return true;
		}
		const roll = randomInt(100);
		return roll < target;
	},
};
