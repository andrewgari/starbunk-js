import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../services/logger';
import webhookService, { WebhookService } from '../../webhooks/webhookService';
import { BotIdentity, ConditionResponseData, ResponseGenerator, TriggerCondition } from './botTypes';
import { ConditionResponseHandler } from './conditionResponseHandler';

/**
 * Interface for conditions that track time and need updates
 */
interface TimeCondition extends TriggerCondition {
	updateLastTime(): void;
}

/**
 * Interface for conditions that contain other conditions
 */
interface CompositeCondition extends TriggerCondition {
	conditions: TriggerCondition[];
}

/**
 * Check if an object is a TimeCondition
 */
function isTimeCondition(obj: unknown): obj is TimeCondition {
	return obj !== null &&
		typeof obj === 'object' &&
		'updateLastTime' in obj &&
		typeof (obj as Record<string, unknown>).updateLastTime === 'function';
}

/**
 * Check if an object is a CompositeCondition
 */
function isCompositeCondition(obj: unknown): obj is CompositeCondition {
	return obj !== null &&
		typeof obj === 'object' &&
		'conditions' in obj &&
		Array.isArray((obj as Record<string, unknown>).conditions);
}

/**
 * ReplyBot - Base class for bots that reply to messages
 *
 * This class handles the core logic of checking if a message should trigger a response,
 * generating that response, and sending it via a webhook.
 */
export default class ReplyBot {
	private identity: BotIdentity;
	private trigger: TriggerCondition;
	private responseGenerator: ResponseGenerator;
	private webhookService: WebhookService;
	private multiResponseEnabled: boolean = false;
	private conditionResponseMap: Map<TriggerCondition, ConditionResponseData> | null = null;
	private conditionResponseHandler: ConditionResponseHandler | null = null;

	/**
	 * Create a new ReplyBot
	 * @param identity The bot's identity (name and avatar)
	 * @param trigger The condition that determines if the bot should respond
	 * @param responseGenerator The generator that creates the bot's response
	 * @param webhookService The service used to send messages (only used in tests, runtime uses the singleton)
	 */
	constructor(
		identity: BotIdentity,
		trigger: TriggerCondition,
		responseGenerator: ResponseGenerator,
		webhookServiceParam: WebhookService
	) {
		this.identity = identity;
		this.trigger = trigger;
		this.responseGenerator = responseGenerator;
		// Always use the singleton instance for runtime, but allow test mocks to be passed in
		this.webhookService = process.env.NODE_ENV === 'test' ? webhookServiceParam : webhookService;
	}

	/**
	 * Enable or disable multi-response mode
	 * @param enabled Whether multi-response mode is enabled
	 */
	setMultiResponseEnabled(enabled: boolean): void {
		this.multiResponseEnabled = enabled;
	}

	/**
	 * Set the data needed for multi-response mode
	 * @param conditionResponseMap Map of conditions to response data
	 * @param conditionResponseHandler The handler for condition-response pairs
	 */
	setMultiResponseData(
		conditionResponseMap: Map<TriggerCondition, ConditionResponseData>,
		conditionResponseHandler: ConditionResponseHandler | null
	): void {
		this.conditionResponseMap = conditionResponseMap;
		this.conditionResponseHandler = conditionResponseHandler;
	}

	/**
	 * Handle an incoming message
	 * @param message The Discord message to handle
	 * @returns True if the bot responded to the message
	 */
	async handleMessage(message: Message): Promise<boolean> {
		// Skip messages from self
		if (this.isSelf(message)) {
			return false;
		}

		// Check if we should trigger
		if (await this.trigger.shouldTrigger(message)) {
			if (this.multiResponseEnabled && this.isMultiResponseTrigger(this.trigger)) {
				// Handle multiple responses
				return await this.handleMultipleResponses(message);
			} else {
				// Handle single response
				return await this.sendReply(message);
			}
		}

		return false;
	}

	/**
	 * Check if a trigger is a MultiResponseTrigger
	 * @param trigger The trigger to check
	 * @returns True if the trigger is a MultiResponseTrigger
	 */
	private isMultiResponseTrigger(trigger: TriggerCondition): boolean {
		return 'getMatchingTriggers' in trigger && typeof (trigger as MultiResponseTrigger).getMatchingTriggers === 'function';
	}

	/**
	 * Handle multiple responses for a message
	 * @param message The Discord message to handle
	 * @returns True if at least one response was sent
	 */
	private async handleMultipleResponses(message: Message): Promise<boolean> {
		if (!this.conditionResponseHandler || !this.conditionResponseMap) {
			console.warn('Multi-response mode enabled but missing required data');
			return await this.sendReply(message);
		}

		// Get the matching triggers
		const multiTrigger = this.trigger as MultiResponseTrigger;
		const matchingTriggers: Set<TriggerCondition> = multiTrigger.getMatchingTriggers();

		if (matchingTriggers.size === 0) {
			return false;
		}

		// Generate and send a response for each matching trigger
		let anySent = false;
		for (const trigger of matchingTriggers) {
			// Find the response data for this trigger
			const responseData = this.conditionResponseMap.get(trigger);

			if (responseData && responseData.responseGenerator) {
				// Generate the response
				const response = await responseData.responseGenerator.generateResponse(message);

				if (response) {
					// Get the identity for this response
					let identity = this.identity;
					if (responseData.identity) {
						identity = {
							...this.identity,
							...responseData.identity
						};
					}

					// Send the response
					await this.webhookService.writeMessage(
						message.channel as TextChannel,
						{
							content: response,
							username: identity.name,
							avatarURL: identity.avatarUrl,
							embeds: []
						}
					);

					// Update any time-based conditions after sending a response
					this.updateTimeConditions(trigger);

					anySent = true;
				}
			}
		}

		// If no specific responses were sent, fall back to the default response
		if (!anySent) {
			return await this.sendReply(message);
		}

		return anySent;
	}

	/**
	 * Send a reply to a message
	 * @param message The Discord message to reply to
	 * @returns True if a reply was sent
	 */
	private async sendReply(message: Message): Promise<boolean> {
		// Generate the response
		const response = await this.responseGenerator.generateResponse(message);

		// If we have a response, send it
		if (response) {
			await this.webhookService.writeMessage(
				message.channel as TextChannel,
				{
					content: response,
					username: this.identity.name,
					avatarURL: this.identity.avatarUrl,
					embeds: []
				}
			);

			// Update any time-based conditions after sending a response
			this.updateTimeConditions(this.trigger);

			return true;
		}

		return false;
	}

	/**
	 * Update the lastTime property of any time-based conditions
	 * @param trigger The trigger condition to update
	 */
	private updateTimeConditions(trigger: TriggerCondition): void {
		try {
			// Handle composite conditions by recursively updating them
			this.updateTimeConditionRecursive(trigger);
		} catch (error) {
			// Log error but don't let it break the bot's operation
			Logger.error(`Error updating time conditions for ${this.identity.name}:`, error as Error);
		}
	}

	/**
	 * Recursively update the lastTime property of any time-based conditions
	 * @param condition The condition to update
	 * @param visited Set of already visited conditions to prevent infinite loops
	 */
	private updateTimeConditionRecursive(condition: TriggerCondition, visited: Set<TriggerCondition> = new Set()): void {
		// Prevent circular reference infinite loops
		if (visited.has(condition)) {
			return;
		}
		visited.add(condition);

		// Check if this is a time-based condition
		if (isTimeCondition(condition)) {
			try {
				// Update the last trigger time
				condition.updateLastTime();
			} catch (error) {
				Logger.debug(`Failed to update time for condition in ${this.identity.name}: ${error instanceof Error ? error.message : String(error)}`);
				// Continue processing other conditions
			}
		}

		// Check if this is a composite condition with children
		if (isCompositeCondition(condition)) {
			// Update all child conditions
			for (const childCondition of condition.conditions) {
				this.updateTimeConditionRecursive(childCondition, visited);
			}
		}
	}

	/**
	 * Check if a message was sent by this bot
	 * @param message The message to check
	 * @returns True if the message was sent by this bot
	 */
	private isSelf(message: Message): boolean {
		// If the message is from a webhook with our name, it's from us
		if (message.webhookId && message.author.username === this.identity.name) {
			return true;
		}

		// If the message is from the bot client, it's from us
		if (message.client.user && message.author.id === message.client.user.id) {
			return true;
		}

		return false;
	}

	/**
	 * Get the bot's name
	 * @returns The bot's name
	 */
	getBotName(): string {
		return this.identity.name;
	}

	/**
	 * Get the bot's identity
	 * @returns The bot's identity (name and avatar)
	 */
	getIdentity(): BotIdentity {
		return this.identity;
	}
}

/**
 * Interface for triggers that can match multiple conditions
 */
interface MultiResponseTrigger extends TriggerCondition {
	getMatchingTriggers(): Set<TriggerCondition>;
}
