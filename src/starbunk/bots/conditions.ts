import { Message } from 'discord.js';
import roleIDs from '../../discord/roleIDs';
import Random from '../../utils/random';
import { TriggerCondition } from './botTypes';
import { isVenn } from './triggers/userConditions';

/**
 * Pattern constants for various message patterns
 */
export const Patterns = {
	BLUE: /\b(blu|blue)\b/i,
	MEAN: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,
	BLUE_REQUEST: /blue?bot,? say something nice about/i,
	BLUE_ACKNOWLEDGMENT: /\\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b\b/i,
	MACARONI: /\b(mac(aroni)?|pasta)\b/i,
	VENN_MENTION: /\bvenn\b/i,
	GUY: /\bguy\b/i,
	BANANA: /banana/i,
	GREMLIN: /gremlin/i,
	CZECH: /\bczech\b/i,
	CHEZH: /\bchezh\b/i,
	SHEESH: /\bsheesh\b/i,
	SPIDER_MAN: /\bspider[-\s]?man\b/i,
	GUNDAM: /\b(gundam|mecha|robot|pacific rim|jaeger)\b/i,
	CHAOS: /\bchaos\b/i,
	BABY: /\b(baby)\b/i,
	MUSIC_COMMAND: /^[!?]play\b/,
	EZIO: /\bezio|h?assassin.*\b/i,
	NICE_NUMBER: /\b69|(sixty-?nine)\b/i,
	HOLD: /\bhold\b/i,
	SIG_GREAT: /\bsig\s+(?:best|greatest)\b/i,
	ATTITUDE: /(you|I|they|we) can'?t/mi,
	WET_BREAD: /wet bread/i
};

/**
 * Base class for all condition implementations
 */
export abstract class Condition implements TriggerCondition {
	abstract shouldTrigger(message: Message): Promise<boolean>;
}

/**
 * Condition that checks if a message matches a pattern
 */
export class PatternCondition extends Condition {
	constructor(private pattern: RegExp) {
		super();
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}

/**
 * Condition that checks if a message is from Venn
 */
export class VennCondition extends Condition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return isVenn(message);
	}
}

/**
 * Condition that checks if a time delay has passed
 * Can be used to check if something happened within a time window (min)
 * or if enough time has passed since the last occurrence (max)
 */
export class TimeDelayCondition extends Condition {
	private lastTime: number = 0;

	/**
   * Create a time delay condition
   * @param delay The time delay in milliseconds
   * @param min If true, checks if time since last trigger is less than delay (within window)
   *            If false, checks if time since last trigger is greater than delay (cooldown)
   */
	constructor(private delay: number, private min: boolean = true) {
		super();
	}

	async shouldTrigger(): Promise<boolean> {
		const currentTime = Date.now();
		const timeSinceLast = currentTime - this.lastTime;

		// If min is true, we want to check if we're within the window
		// If min is false, we want to check if enough time has passed
		const result = this.min
			? timeSinceLast < this.delay  // Within time window
			: timeSinceLast > this.delay; // Cooldown has passed

		return result;
	}

	/**
   * Update the last trigger time to now
   */
	updateLastTime(): void {
		this.lastTime = Date.now();
	}
}

/**
 * Condition for wet bread mentions that checks for the WetBread role
 */
export class WetBreadPatternCondition extends Condition {
	constructor() {
		super();
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot || !message.member) return false;

		const hasWetBreadRole = message.member.roles.cache.some(
			(role) => role.id === roleIDs.WetBread
		);

		return Patterns.WET_BREAD.test(message.content) && hasWetBreadRole;
	}
}

/**
 * Condition for bot messages with random chance
 */
export class BotMessagePatternCondition extends Condition {
	constructor(private chance: number) {
		super();
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		// Skip our own messages, but allow other bot messages
		if (message.author.bot && message.author.username === 'BotBot') return false;

		// For bot messages, use our custom trigger with random chance
		return message.author.bot && Random.percentChance(this.chance);
	}
}

// For backward compatibility, we'll keep the class names but make them use the generic PatternCondition
// This will make the transition easier and prevent breaking existing code
export class BluePatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.BLUE);
	}
}

export class MeanPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.MEAN);
	}
}

export class BlueRequestPattern extends PatternCondition {
	constructor() {
		super(Patterns.BLUE_REQUEST);
	}
}

export class BlueAcknowledgmentCondition extends PatternCondition {
	constructor() {
		super(Patterns.BLUE_ACKNOWLEDGMENT);
	}
}

export class MacaroniPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.MACARONI);
	}
}

export class VennMentionCondition extends PatternCondition {
	constructor() {
		super(Patterns.VENN_MENTION);
	}
}

export class GuyPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.GUY);
	}
}

export class BananaPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.BANANA);
	}
}

export class GremlinPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.GREMLIN);
	}
}

export class CzechPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.CZECH);
	}
}

export class ChezhPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.CHEZH);
	}
}

export class SheeshPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.SHEESH);
	}
}

export class SpiderManPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.SPIDER_MAN);
	}
}

export class GundamPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.GUNDAM);
	}
}

export class ChaosPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.CHAOS);
	}
}

export class BabyPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.BABY);
	}
}

export class MusicCommandPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.MUSIC_COMMAND);
	}
}

export class EzioPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.EZIO);
	}
}

export class NiceNumberPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.NICE_NUMBER);
	}
}

export class HoldPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.HOLD);
	}
}

export class SigGreatPatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.SIG_GREAT);
	}
}

export class AttitudePatternCondition extends PatternCondition {
	constructor() {
		super(Patterns.ATTITUDE);
	}
}
