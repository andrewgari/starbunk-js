import Random from '../../../../utils/random';
import { TriggerCondition } from '../../botTypes';

/**
 * Custom condition that triggers with a configurable random chance
 *
 * This condition can be used to randomly trigger responses based on a percentage chance
 */
export class RandomChanceCondition implements TriggerCondition {
	/**
   * Creates a new random chance condition
   *
   * @param chance - Percentage chance (0-100) that this condition will trigger
   * @throws Error if chance is outside the valid range of 0-100
   */
	constructor(private chance: number) {
		if (chance < 0 || chance > 100) {
			throw new Error('Chance must be between 0 and 100');
		}
	}

	/**
   * Determines if the condition should trigger based on random chance
   *
   * @returns True if the random chance check passes, false otherwise
   */
	async shouldTrigger(): Promise<boolean> {
		return Random.percentChance(this.chance);
	}
}
