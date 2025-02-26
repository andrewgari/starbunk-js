import { Message } from 'discord.js';
import { Logger } from '../../services/logger';
import { WebhookService } from '../../webhooks/webhookService';
import { BotBuilder } from './botBuilder';
import { BotIdentity, CompositeTrigger, PatternTrigger, RandomResponse, ResponseGenerator, StaticResponse, TriggerCondition, UserRandomTrigger } from './botTypes';
import ReplyBot from './replyBot';

export interface SimpleBotConfig {
	name: string;
	avatarUrl: string;
	pattern?: RegExp;
	response: string | string[];
	randomUserTriggers?: Array<{
		userId: string;
		chance: number;
	}>;
}

export function createSimpleBot(
	config: SimpleBotConfig,
	webhookService: WebhookService
): ReplyBot {
	const identity: BotIdentity = {
		name: config.name,
		avatarUrl: config.avatarUrl
	};

	const triggers: TriggerCondition[] = [];

	if (config.pattern) {
		triggers.push(new PatternTrigger(config.pattern));
	}

	if (config.randomUserTriggers) {
		triggers.push(...config.randomUserTriggers.map(
			t => new UserRandomTrigger(t.userId, t.chance)
		));
	}

	const trigger = new CompositeTrigger(triggers);

	const responseGenerator: ResponseGenerator = Array.isArray(config.response)
		? new RandomResponse(config.response)
		: new StaticResponse(config.response);

	const bot = new ReplyBot(identity, trigger, responseGenerator, webhookService);

	// Add getBotName method to the bot instance
	interface BotWithGetName extends ReplyBot {
		getBotName(): string;
	}

	(bot as BotWithGetName).getBotName = function () {
		return identity.name;
	};

	return bot as BotWithGetName;
}

export interface DynamicIdentityConfig {
	defaultName: string;
	defaultAvatarUrl: string;
	updateIdentity(message: Message): Promise<BotIdentity>;
}

export class DynamicIdentity implements BotIdentity {
	name: string;
	avatarUrl: string;

	constructor(private config: {
		defaultName: string;
		defaultAvatarUrl: string;
		updateIdentity: (message: Message) => Promise<BotIdentity>;
	}) {
		this.name = config.defaultName;
		this.avatarUrl = config.defaultAvatarUrl;
	}

	async updateFrom(message: Message): Promise<void> {
		try {
			const newIdentity = await this.config.updateIdentity(message);
			this.name = newIdentity.name || this.config.defaultName;
			this.avatarUrl = newIdentity.avatarUrl || this.config.defaultAvatarUrl;
		} catch (err) {
			Logger.error('Error updating dynamic identity:', err as Error);
			// Reset to defaults on error
			this.name = this.config.defaultName;
			this.avatarUrl = this.config.defaultAvatarUrl;
		}
	}
}

export class DynamicResponse implements ResponseGenerator {
	constructor(
		private identity: DynamicIdentity,
		private baseResponseGenerator: ResponseGenerator
	) { }

	async generateResponse(message: Message): Promise<string> {
		await this.identity.updateFrom(message);
		return this.baseResponseGenerator.generateResponse(message);
	}
}

/**
 * Factory functions for creating common bot types
 */

/**
 * Create a simple bot that responds to a pattern with a static message
 */
export function createPatternBot(name: string, pattern: RegExp, response: string, avatarUrl: string, webhookService: WebhookService): ReplyBot {
	return new BotBuilder(name, webhookService)
		.withAvatar(avatarUrl)
		.withPatternTrigger(pattern)
		.respondsWithStatic(response)
		.build();
}

/**
 * Create a bot that responds to a pattern with random responses
 */
export function createRandomResponseBot(
	name: string,
	pattern: RegExp,
	responses: string[],
	avatarUrl: string,
	webhookService: WebhookService
): ReplyBot {
	return new BotBuilder(name, webhookService)
		.withAvatar(avatarUrl)
		.withPatternTrigger(pattern)
		.respondsWithRandom(responses)
		.build();
}

/**
 * Create a bot that responds randomly to a specific user's messages
 */
export function createUserRandomBot(
	name: string,
	userId: string,
	chance: number,
	responses: string[],
	avatarUrl: string,
	webhookService: WebhookService
): ReplyBot {
	return new BotBuilder(name, webhookService)
		.withAvatar(avatarUrl)
		.withUserRandomTrigger(userId, chance)
		.respondsWithRandom(responses)
		.build();
}

/**
 * Create a dynamic identity bot (like GuyBot) that mimics another user
 */
export function createMimicBot(
	name: string,
	userId: string,
	pattern: RegExp,
	chance: number,
	responses: string[],
	updateIdentityFn: (message: Message) => Promise<BotIdentity>,
	webhookService: WebhookService
): ReplyBot {
	return new BotBuilder(name, webhookService)
		.withPatternTrigger(pattern)
		.withUserRandomTrigger(userId, chance)
		.respondsWithRandom(responses)
		.withDynamicIdentity('', updateIdentityFn)
		.build();
}
