import { randomInt } from 'crypto';

export default {
	roll: (max: number) => {
		return Math.floor(Math.random() * max);
	},
	percentChance: (target: number) => {
		// Always return true in debug mode
		if (process.env.DEBUG_MODE === 'true') {
			return true;
		}
		const roll = randomInt(100);
		return roll < target;
	},
};
