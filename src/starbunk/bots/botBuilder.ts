import { Message } from 'discord.js';
import { WebhookService } from '../../webhooks/webhookService';
import { DynamicIdentity, DynamicResponse } from './botFactory';
import { BotIdentity, PatternTrigger, RandomResponse, ResponseGenerator, StaticResponse, TriggerCondition } from './botTypes';
import { ConditionResponseHandler } from './conditionResponseHandler';
import ReplyBot from './replyBot';
import { AllConditions } from './triggers/conditions/allConditions';
import { OneCondition } from './triggers/conditions/oneCondition';
import { RandomChanceCondition } from './triggers/conditions/randomChanceCondition';

/**
 * Trigger that combines multiple triggers with OR logic
 * Returns true if any of the triggers match
 * Used internally by BotBuilder
 */
class CompositeTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (await trigger.shouldTrigger(message)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * Trigger that collects all matching triggers
 * Used internally by BotBuilder for multi-response bots
 */
class MultiResponseTrigger implements TriggerCondition {
	private matchingTriggers: Set<TriggerCondition> = new Set();

	constructor(private triggers: TriggerCondition[]) { }

	/**
	 * Checks all triggers and collects the ones that match
	 * Returns true if any trigger matches
	 */
	async shouldTrigger(message: Message): Promise<boolean> {
		// Clear previous matches
		this.matchingTriggers.clear();

		// Check each trigger
		let anyMatch = false;
		for (const trigger of this.triggers) {
			if (await trigger.shouldTrigger(message)) {
				this.matchingTriggers.add(trigger);
				anyMatch = true;
			}
		}

		return anyMatch;
	}

	/**
	 * Get the set of triggers that matched the last message
	 */
	getMatchingTriggers(): Set<TriggerCondition> {
		return this.matchingTriggers;
	}
}

/**
 * Trigger that has a random chance to trigger for a specific user
 * Used internally by BotBuilder
 */
class UserRandomTrigger implements TriggerCondition {
	constructor(private userId: string, private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.id !== this.userId) {
			return false;
		}
		return Math.random() * 100 < this.chance;
	}
}

/**
 * Custom response with identity information
 */
interface ResponseWithIdentity {
	responseGenerator: ResponseGenerator;
	identity?: Partial<BotIdentity>;
	[key: string]: unknown;
}

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
	private botMessagesAllowed: boolean = false;
	private useMultipleResponses: boolean = false;

	// Track the current condition for chaining
	private currentCondition: TriggerCondition | null = null;

	// Track condition-specific identity overrides
	private conditionResponseMap: Map<TriggerCondition, ResponseWithIdentity> = new Map();

	// Track if we need to create a dynamic identity for condition-specific avatars
	private usesDynamicAvatars = false;

	/**
	 * Create a new BotBuilder
	 * @param name The name of the bot
	 * @param webhookService The webhook service to use
	 */
	constructor(name: string, webhookService: WebhookService) {
		this.name = name;
		this.identity = { name, avatarUrl: '' };
		this.webhookService = webhookService;

		// Initialize the condition response handler for all bots
		this.conditionResponseHandler = new ConditionResponseHandler();
		this.responseGenerator = this.conditionResponseHandler;
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
	 * Configure whether the bot should respond to messages from other bots
	 * By default, bots will ignore messages from other bots
	 *
	 * @param allowed Whether to allow bot messages (defaults to true)
	 */
	allowBotMessages(allowed: boolean = true): BotBuilder {
		this.botMessagesAllowed = allowed;
		return this;
	}

	/**
	 * Configure whether the bot should respond to multiple matching patterns
	 * By default, bots will only respond to the first matching pattern
	 *
	 * @param enabled Whether to enable multiple responses (defaults to true)
	 */
	withMultipleResponses(enabled: boolean = true): BotBuilder {
		this.useMultipleResponses = enabled;
		return this;
	}

	/**
	 * Set the avatar URL for the current condition
	 * @param url The URL of the avatar image for this specific condition
	 */
	withConditionAvatar(url: string): BotBuilder {
		if (!this.currentCondition) {
			console.warn('Setting condition avatar without a condition - did you forget to call when()?');
			return this;
		}

		this.usesDynamicAvatars = true;

		// Store the avatar with the current condition
		const existingData = this.conditionResponseMap.get(this.currentCondition);
		if (existingData) {
			existingData.identity = existingData.identity || {};
			existingData.identity.avatarUrl = url;
		} else {
			this.conditionResponseMap.set(this.currentCondition, {
				responseGenerator: new StaticResponse(''),  // Placeholder, will be replaced
				identity: { avatarUrl: url }
			});
		}

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
	 * Add a random chance trigger to the bot
	 * This will make the bot respond with the specified percentage chance
	 *
	 * @param chance Percentage chance (1-100) to trigger the response
	 * @returns The builder instance for chaining
	 */
	withRandomChance(chance: number): BotBuilder {
		if (chance < 1 || chance > 100) {
			console.warn(`Random chance should be between 1 and 100. Got: ${chance}. Clamping to valid range.`);
			chance = Math.max(1, Math.min(chance, 100));
		}

		this.triggers.push(new RandomChanceCondition(chance));
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
	 * Set the current condition for the next response
	 * @param condition The condition to set as current
	 * @returns The builder instance for chaining
	 */
	when(condition: TriggerCondition): BotBuilder {
		this.currentCondition = condition;
		return this;
	}

	/**
	 * Configure the bot to respond with a static message for the current condition
	 * @param response The static response message
	 * @param avatarUrl Optional avatar URL specific to this response
	 */
	respondsWithStatic(response: string, avatarUrl?: string): BotBuilder {
		// Create a static response generator
		const responseGen = new StaticResponse(response);

		// If we have a current condition, add it to the condition map
		if (this.currentCondition) {
			const identity = avatarUrl ? { avatarUrl } : undefined;
			this.addConditionResponsePair(responseGen, this.currentCondition, identity);
			this.currentCondition = null;
			return this;
		}

		// Otherwise, set it as the main response generator
		const identity = avatarUrl ? { avatarUrl } : undefined;
		this.responseGenerator = responseGen;
		this.conditionResponseMap.set(this.allConditions(), { responseGenerator: responseGen, identity });
		return this;
	}

	/**
	 * Configure the bot to respond with a random message from a list for the current condition
	 * @param responses Array of possible responses
	 * @param avatarUrl Optional avatar URL specific to this response
	 */
	respondsWithRandom(responses: string[], avatarUrl?: string): BotBuilder {
		// Create a random response generator
		const responseGen = new RandomResponse(responses);

		// If we have a current condition, add it to the condition map
		if (this.currentCondition) {
			const identity = avatarUrl ? { avatarUrl } : undefined;
			this.addConditionResponsePair(responseGen, this.currentCondition, identity);
			this.currentCondition = null;
			return this;
		}

		// Otherwise, set it as the main response generator
		const identity = avatarUrl ? { avatarUrl } : undefined;
		this.responseGenerator = responseGen;
		this.conditionResponseMap.set(this.allConditions(), { responseGenerator: responseGen, identity });
		return this;
	}

	/**
	 * Configure the bot to use a custom response generator for the current condition
	 * @param generator Custom response generator
	 * @param avatarUrl Optional avatar URL specific to this response
	 */
	respondsWithCustom(generator: ResponseGenerator, avatarUrl?: string): BotBuilder {
		if (this.currentCondition) {
			// If we have a current condition, add it as a condition-response pair
			const identity = avatarUrl ? { avatarUrl } : undefined;
			this.addConditionResponsePair(generator, this.currentCondition, identity);
			this.currentCondition = null;
		} else {
			// Add a default response that will be used if no conditions match
			const defaultCondition = { shouldTrigger: async () => true };
			const identity = avatarUrl ? { avatarUrl } : undefined;

			this.addConditionResponsePair(generator, defaultCondition, identity);
		}
		return this;
	}

	/**
	 * Helper method to add a condition-response pair to the handler
	 * @param response The response generator to use
	 * @param condition The condition that triggers this response
	 * @param identity Optional identity override for this specific response
	 */
	private addConditionResponsePair(
		response: ResponseGenerator,
		condition: TriggerCondition,
		identity?: Partial<BotIdentity>
	): void {
		// Make sure we have the handler
		if (!this.conditionResponseHandler) {
			this.conditionResponseHandler = new ConditionResponseHandler();
			this.responseGenerator = this.conditionResponseHandler;
		}

		// If we have an identity for this condition, track it
		if (identity) {
			this.usesDynamicAvatars = true;
			this.conditionResponseMap.set(condition, {
				responseGenerator: response,
				identity
			});
		} else {
			this.conditionResponseMap.set(condition, {
				responseGenerator: response
			});
		}

		// Add the pair to the handler
		this.conditionResponseHandler.addPair(
			response,
			(message: Message) => condition.shouldTrigger(message)
		);

		// Ensure we have a trigger to activate the bot
		if (this.triggers.length === 0) {
			this.withCustomTrigger({
				shouldTrigger: async () => true
			});
		}
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
	 * @param avatarUrl Optional avatar URL specific to this response
	 * @param conditions One or more condition functions that must all be true for the response to be used
	 */
	withConditionResponse(
		response: ResponseGenerator,
		avatarOrCondition: string | null | TriggerCondition | ((message: Message) => Promise<boolean>),
		...restConditions: Array<TriggerCondition | ((message: Message) => Promise<boolean>)>
	): BotBuilder {
		// Handle the case where the first argument is an avatar URL
		if (typeof avatarOrCondition === 'string') {
			// The first argument is an avatar URL
			const avatarUrl = avatarOrCondition;
			const identity = avatarUrl ? { avatarUrl } : undefined;

			// The rest are conditions
			const conditions = restConditions as Array<TriggerCondition | ((message: Message) => Promise<boolean>)>;

			// If no conditions were provided, use a default condition
			if (conditions.length === 0) {
				const defaultCondition = { shouldTrigger: async () => true };
				this.addConditionResponsePair(response, defaultCondition, identity);
				return this;
			}

			// Convert function conditions to TriggerCondition objects
			const triggerConditions = conditions.map(condition => {
				if (typeof condition === 'function') {
					return {
						shouldTrigger: condition
					};
				}
				return condition;
			});

			// Create a composite condition that requires all conditions to be true
			const compositeCondition = this.allConditions(...triggerConditions);
			this.addConditionResponsePair(response, compositeCondition, identity);
			return this;
		}

		// Handle the case where the first argument is a condition
		const conditions = [avatarOrCondition, ...restConditions] as Array<TriggerCondition | ((message: Message) => Promise<boolean>)>;

		// If we have multiple conditions, combine them with AND logic
		const triggerConditions = conditions.map(condition => {
			if (typeof condition === 'function') {
				return {
					shouldTrigger: condition
				};
			}
			return condition;
		});

		// Create a composite condition that requires all conditions to be true
		const combinedCondition = this.allConditions(...triggerConditions);

		// Add the condition-response pair
		this.addConditionResponsePair(response, combinedCondition);

		return this;
	}

	/**
	 * Add a custom condition-response pair with a static response
	 * This is a more declarative way to define bot behavior
	 * Lower items in the list take precedence
	 *
	 * @param response The static response text to use when the conditions match
	 * @param avatarUrl Optional avatar URL specific to this response
	 * @param conditions One or more conditions that must all be true for the response to be used
	 */
	withCustomCondition(
		response: string,
		avatarOrCondition: string | null | TriggerCondition,
		...restConditions: TriggerCondition[]
	): BotBuilder {
		// Create a static response generator
		const responseGen = new StaticResponse(response);

		// Handle the case where the first argument is an avatar URL
		if (typeof avatarOrCondition === 'string' || avatarOrCondition === null) {
			// The first argument is an avatar URL
			const avatarUrl = avatarOrCondition;
			const identity = avatarUrl ? { avatarUrl } : undefined;

			// The rest are conditions
			const conditions = restConditions;

			// If no conditions were provided, use a default condition
			if (conditions.length === 0) {
				const defaultCondition = { shouldTrigger: async () => true };
				this.addConditionResponsePair(responseGen, defaultCondition, identity);
				return this;
			}

			// Create a composite condition that requires all conditions to be true
			const compositeCondition = this.allConditions(...conditions);
			this.addConditionResponsePair(responseGen, compositeCondition, identity);
			return this;
		}

		// Handle the case where the first argument is a condition
		const conditions = [avatarOrCondition, ...restConditions];

		// Create a composite condition that requires all conditions to be true
		const compositeCondition = this.allConditions(...conditions);

		// Add the condition-response pair
		this.addConditionResponsePair(responseGen, compositeCondition);

		return this;
	}

	/**
	 * Create a condition that requires all provided conditions to be true (logical AND)
	 * @param conditions The conditions to combine with AND logic
	 * @returns A TriggerCondition that returns true only if all conditions are true
	 */
	allConditions(...conditions: TriggerCondition[]): TriggerCondition {
		// If no conditions are provided, return a condition that always returns true
		if (conditions.length === 0) {
			return {
				shouldTrigger: async () => true
			};
		}
		return new AllConditions(...conditions);
	}

	/**
	 * Create a condition that requires at least one of the provided conditions to be true (logical OR)
	 * @param conditions The conditions to combine with OR logic
	 * @returns A TriggerCondition that returns true if any condition is true
	 */
	oneCondition(...conditions: TriggerCondition[]): TriggerCondition {
		return new OneCondition(...conditions);
	}

	// Add a method to chain conditions and responses
	with(condition: TriggerCondition, response: string): BotBuilder {
		const responseGen = new StaticResponse(response);
		this.addConditionResponsePair(responseGen, condition);
		return this;
	}

	/**
	 * Build the final ReplyBot instance
	 * @returns A configured ReplyBot instance
	 */
	build(): ReplyBot {
		// Check if there's a pending condition without a response
		if (this.currentCondition) {
			console.warn(`Bot ${this.name} has a pending condition without a response, it will be ignored`);
			this.currentCondition = null;
		}

		// Validate configuration
		if (this.triggers.length === 0) {
			throw new Error(`Bot ${this.name} must have at least one trigger`);
		}

		if (!this.responseGenerator) {
			throw new Error(`Bot ${this.name} must have a response generator`);
		}

		// Create the appropriate identity
		let identity: BotIdentity = this.identity;
		let responseGen = this.responseGenerator;

		// Configure dynamic identity if we have per-condition avatars
		if (this.usesDynamicAvatars) {
			// Create a dynamic identity that selects the appropriate avatar based on which condition matched
			const dynamicAvatar = {
				defaultName: this.name,
				defaultAvatarUrl: this.identity.avatarUrl || '',
				updateIdentity: async (message: Message): Promise<BotIdentity> => {
					// Check which condition matched this message
					for (const [condition, data] of this.conditionResponseMap.entries()) {
						if (await condition.shouldTrigger(message)) {
							if (data.identity && data.identity.avatarUrl) {
								return {
									name: this.name,
									avatarUrl: data.identity.avatarUrl
								};
							}
							break;
						}
					}

					// Default to the bot's main identity
					return {
						name: this.name,
						avatarUrl: this.identity.avatarUrl || ''
					};
				}
			};

			const dynamicIdentity = new DynamicIdentity(dynamicAvatar);
			identity = dynamicIdentity;

			// If we have a dynamic identity, wrap the response generator
			responseGen = new DynamicResponse(dynamicIdentity, this.responseGenerator);
		}
		// If explicit dynamic identity was specified, use that instead
		else if (this.dynamicIdentityConfig) {
			const dynamicIdentity = new DynamicIdentity(this.dynamicIdentityConfig);
			identity = dynamicIdentity;

			// If we have a dynamic identity, wrap the response generator
			responseGen = new DynamicResponse(dynamicIdentity, this.responseGenerator);
		}

		// Create the appropriate trigger based on the number of triggers and multi-response setting
		let trigger: TriggerCondition;

		if (this.triggers.length === 1) {
			trigger = this.triggers[0];
		} else if (this.useMultipleResponses) {
			// Use MultiResponseTrigger for bots that need to respond to multiple patterns
			trigger = new MultiResponseTrigger(this.triggers);
		} else {
			// Use CompositeTrigger for bots that only need to respond to the first matching pattern
			trigger = new CompositeTrigger(this.triggers);
		}

		// Wrap the original trigger to add our filtering logic
		const originalTrigger = trigger;
		trigger = {
			shouldTrigger: async (message: Message): Promise<boolean> => {
				// ALWAYS prevent the bot from responding to itself
				if (message.client.user && message.author.id === message.client.user.id) {
					return false;
				}

				// Apply the bot messages filter if needed
				if (!this.botMessagesAllowed && message.author.bot) {
					return false;
				}

				// If we passed all filters, use the original trigger
				return originalTrigger.shouldTrigger(message);
			}
		};

		// Create the bot class
		const finalName = this.name;
		const webhookService = this.webhookService;
		const multiResponseEnabled = this.useMultipleResponses;
		const conditionResponseMap = this.conditionResponseMap;
		const conditionResponseHandler = this.conditionResponseHandler;

		class BuiltBot extends ReplyBot {
			constructor() {
				super(identity, trigger, responseGen, webhookService);

				// Pass the multi-response setting to the ReplyBot
				this.setMultiResponseEnabled(multiResponseEnabled);

				// If using multi-response, pass the necessary data
				if (multiResponseEnabled) {
					this.setMultiResponseData(conditionResponseMap, conditionResponseHandler);
				}
			}

			getBotName(): string {
				return finalName;
			}
		}

		// Ensure we process all condition-response pairs
		if (this.conditionResponseHandler) {
			for (const [condition, data] of this.conditionResponseMap.entries()) {
				this.conditionResponseHandler.addPair(
					data.responseGenerator,
					(message: Message) => condition.shouldTrigger(message)
				);
			}
		}

		// Return an instance of the built bot
		return new BuiltBot();
	}
}
