import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../webhooks/webhookService';
import { BotIdentity, ConditionResponseData, ResponseGenerator, TriggerCondition } from './botTypes';
import { ConditionResponseHandler } from './conditionResponseHandler';

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
	 * @param webhookService The service used to send messages
	 */
	constructor(
		identity: BotIdentity,
		trigger: TriggerCondition,
		responseGenerator: ResponseGenerator,
		webhookService: WebhookService
	) {
		this.identity = identity;
		this.trigger = trigger;
		this.responseGenerator = responseGenerator;
		this.webhookService = webhookService;
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
			return true;
		}

		return false;
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
