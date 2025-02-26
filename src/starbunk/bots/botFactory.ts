import { Message } from 'discord.js';
import { WebhookService } from '../../webhooks/webhookService';
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

	return new ReplyBot(identity, trigger, responseGenerator, webhookService);
}

export interface DynamicIdentityConfig {
	defaultName: string;
	defaultAvatarUrl: string;
	updateIdentity(message: Message): Promise<BotIdentity>;
}

export class DynamicIdentity implements BotIdentity {
	private currentName: string;
	private currentAvatarUrl: string;
	private updateFn: (message: Message) => Promise<BotIdentity>;

	constructor(config: DynamicIdentityConfig) {
		this.currentName = config.defaultName;
		this.currentAvatarUrl = config.defaultAvatarUrl;
		this.updateFn = config.updateIdentity;
	}

	get name(): string {
		return this.currentName;
	}

	get avatarUrl(): string {
		return this.currentAvatarUrl;
	}

	async update(message: Message): Promise<void> {
		const newIdentity = await this.updateFn(message);
		this.currentName = newIdentity.name;
		this.currentAvatarUrl = newIdentity.avatarUrl;
	}
}

export class DynamicResponse implements ResponseGenerator {
	constructor(
		private identity: DynamicIdentity,
		private baseResponse: ResponseGenerator
	) { }

	async generateResponse(message: Message): Promise<string> {
		await this.identity.update(message);
		return this.baseResponse.generateResponse(message);
	}
}
