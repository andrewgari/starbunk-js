import { Message } from 'discord.js';
import { WebhookService } from '../../webhooks/webhookService';
import { DynamicIdentity, DynamicResponse } from './botFactory';
import { BotIdentity, CompositeTrigger, PatternTrigger, RandomResponse, ResponseGenerator, StaticResponse, TriggerCondition, UserRandomTrigger } from './botTypes';
import ReplyBot from './replyBot';

/**
 * BotBuilder - A fluent builder for creating ReplyBot instances with minimal code
 *
 * This builder simplifies the creation of bots by handling all the common patterns
 * with a chainable API that reduces boilerplate code.
 */
export class BotBuilder {
	private name: string;
	private identity: BotIdentity;
	private triggers: TriggerCondition[] = [];
	private responseGenerator: ResponseGenerator | null = null;
	private webhookService: WebhookService;
	private dynamicIdentityConfig: {
		defaultName: string;
		defaultAvatarUrl: string;
		updateIdentity: (message: Message) => Promise<BotIdentity>;
	} | null = null;

	/**
	 * Create a new BotBuilder
	 * @param name The name of the bot
	 * @param webhookService The webhook service to use
	 */
	constructor(name: string, webhookService: WebhookService) {
		this.name = name;
		this.identity = { name, avatarUrl: '' };
		this.webhookService = webhookService;
	}

	/**
	 * Set the avatar URL for the bot
	 * @param url The URL of the avatar image
	 */
	withAvatar(url: string): BotBuilder {
		this.identity.avatarUrl = url;
		return this;
	}

	/**
	 * Add a pattern trigger to the bot
	 * @param pattern Regular expression to match against messages
	 */
	withPatternTrigger(pattern: RegExp): BotBuilder {
		this.triggers.push(new PatternTrigger(pattern));
		return this;
	}

	/**
	 * Add a user random chance trigger to the bot
	 * @param userId The Discord user ID to trigger on
	 * @param chance Percentage chance (0-100) to trigger
	 */
	withUserRandomTrigger(userId: string, chance: number): BotBuilder {
		this.triggers.push(new UserRandomTrigger(userId, chance));
		return this;
	}

	/**
	 * Add a custom trigger to the bot
	 * @param trigger A custom trigger implementation
	 */
	withCustomTrigger(trigger: TriggerCondition): BotBuilder {
		this.triggers.push(trigger);
		return this;
	}

	/**
	 * Configure the bot to respond with a static message
	 * @param response The static response message
	 */
	respondsWithStatic(response: string): BotBuilder {
		this.responseGenerator = new StaticResponse(response);
		return this;
	}

	/**
	 * Configure the bot to respond with a random message from a list
	 * @param responses Array of possible responses
	 */
	respondsWithRandom(responses: string[]): BotBuilder {
		this.responseGenerator = new RandomResponse(responses);
		return this;
	}

	/**
	 * Configure the bot to use a custom response generator
	 * @param generator Custom response generator
	 */
	respondsWithCustom(generator: ResponseGenerator): BotBuilder {
		this.responseGenerator = generator;
		return this;
	}

	/**
	 * Configure the bot with a dynamic identity that changes based on messages
	 * @param defaultAvatarUrl Default avatar URL
	 * @param updateFn Function that updates the identity based on messages
	 */
	withDynamicIdentity(defaultAvatarUrl: string, updateFn: (message: Message) => Promise<BotIdentity>): BotBuilder {
		this.dynamicIdentityConfig = {
			defaultName: this.name,
			defaultAvatarUrl,
			updateIdentity: updateFn
		};
		return this;
	}

	/**
	 * Build the final ReplyBot instance
	 * @returns A configured ReplyBot instance
	 */
	build(): ReplyBot {
		// Validate configuration
		if (this.triggers.length === 0) {
			throw new Error(`Bot ${this.name} must have at least one trigger`);
		}

		if (!this.responseGenerator) {
			throw new Error(`Bot ${this.name} must have a response generator`);
		}

		// Create the appropriate identity
		let identity = this.identity;
		let responseGen = this.responseGenerator;

		// Configure dynamic identity if specified
		if (this.dynamicIdentityConfig) {
			const dynamicIdentity = new DynamicIdentity(this.dynamicIdentityConfig);
			identity = dynamicIdentity;

			// If we have a dynamic identity, wrap the response generator
			responseGen = new DynamicResponse(dynamicIdentity, this.responseGenerator);
		}

		// Create the appropriate trigger based on the number of triggers
		const trigger = this.triggers.length === 1
			? this.triggers[0]
			: new CompositeTrigger(this.triggers);

		// Create the bot class
		const finalName = this.name;
		const webhookService = this.webhookService;

		class BuiltBot extends ReplyBot {
			constructor() {
				super(identity, trigger, responseGen, webhookService);
			}

			getBotName(): string {
				return finalName;
			}
		}

		// Return an instance of the built bot
		return new BuiltBot();
	}
}
