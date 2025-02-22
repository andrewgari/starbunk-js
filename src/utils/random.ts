import { randomInt } from 'crypto';

export default {
	roll: (max: number) => {
		return Math.floor(Math.random() * max);
	},
	percentChance: (target: number) => {
		const roll = randomInt(100);
		return roll < target;
	},
};
