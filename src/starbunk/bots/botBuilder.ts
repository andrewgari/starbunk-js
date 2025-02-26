import { Message } from 'discord.js';
import { WebhookService } from '../../webhooks/webhookService';
import { DynamicIdentity, DynamicResponse } from './botFactory';
import { BotIdentity, CompositeTrigger, PatternTrigger, RandomResponse, ResponseGenerator, StaticResponse, TriggerCondition, UserRandomTrigger } from './botTypes';
import { ConditionResponseHandler } from './conditionResponseHandler';
import { Condition } from './conditions';
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
	private conditionResponseHandler: ConditionResponseHandler | null = null;
	private customConditions: Array<{
		response: string | ResponseGenerator;
		conditions: Condition[];
	}> = [];

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
	 * Add a condition-response pair to the bot
	 * This allows for directly pairing a response with one or more conditions
	 *
	 * @param response The response generator to use when the conditions match
	 * @param conditions One or more condition functions that must all be true for the response to be used
	 */
	withConditionResponse(
		response: ResponseGenerator,
		...conditions: Array<TriggerCondition | ((message: Message) => Promise<boolean>)>
	): BotBuilder {
		// Create the handler if it doesn't exist yet
		if (!this.conditionResponseHandler) {
			this.conditionResponseHandler = new ConditionResponseHandler();
			this.responseGenerator = this.conditionResponseHandler;
		}

		// Create a combined condition from all the provided conditions
		const combinedCondition = async (message: Message): Promise<boolean> => {
			for (const condition of conditions) {
				// Check if it's a TriggerCondition or a function
				const result = typeof condition === 'function'
					? await condition(message)
					: await condition.shouldTrigger(message);

				if (!result) return false;
			}
			return true;
		};

		// Add the pair to the handler
		this.conditionResponseHandler.addPair(response, combinedCondition);

		// Make sure we have a trigger that will activate the bot
		// We'll add a simple trigger that always returns true, since the actual
		// condition checking will be done by the ConditionResponseHandler
		if (this.triggers.length === 0) {
			this.withCustomTrigger({
				shouldTrigger: async () => true
			});
		}

		return this;
	}

	/**
	 * Add a custom condition-response pair with a static response
	 * This is a more declarative way to define bot behavior
	 * Lower items in the list take precedence
	 *
	 * @param response The static response text to use when the conditions match
	 * @param conditions One or more conditions that must all be true for the response to be used
	 */
	withCustomCondition(
		response: string,
		...conditions: Condition[]
	): BotBuilder {
		this.customConditions.push({
			response,
			conditions
		});
		return this;
	}

	/**
	 * Add multiple custom condition-response pairs at once
	 * This is a convenience method for adding multiple conditions
	 * Lower items in the list take precedence
	 *
	 * @param pairs An array of condition-response pairs
	 */
	withCustomConditions(
		...pairs: Array<{
			response: string;
			conditions: Condition[];
		}>
	): BotBuilder {
		for (const pair of pairs) {
			this.customConditions.push({
				response: pair.response,
				conditions: pair.conditions
			});
		}
		return this;
	}

	/**
	 * Build the final ReplyBot instance
	 * @returns A configured ReplyBot instance
	 */
	build(): ReplyBot {
		// Process custom conditions if any
		if (this.customConditions.length > 0) {
			// Create the handler if it doesn't exist yet
			if (!this.conditionResponseHandler) {
				this.conditionResponseHandler = new ConditionResponseHandler();
				this.responseGenerator = this.conditionResponseHandler;
			}

			// Add conditions in reverse order (so lower items take precedence)
			for (let i = this.customConditions.length - 1; i >= 0; i--) {
				const pair = this.customConditions[i];
				const responseGen = typeof pair.response === 'string'
					? new StaticResponse(pair.response)
					: pair.response;

				// Create a combined condition from all the provided conditions
				const combinedCondition = async (message: Message): Promise<boolean> => {
					for (const condition of pair.conditions) {
						if (!(await condition.shouldTrigger(message))) {
							return false;
						}
					}
					return true;
				};

				// Add the pair to the handler
				this.conditionResponseHandler.addPair(responseGen, combinedCondition);
			}

			// Make sure we have a trigger that will activate the bot
			if (this.triggers.length === 0) {
				this.withCustomTrigger({
					shouldTrigger: async () => true
				});
			}
		}

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
