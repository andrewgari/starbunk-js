import { Message } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { withDefaultBotBehavior } from './conditions';

/**
 * Typed TriggerName for better type safety and debugging
 */
export type TriggerName = string;

export function createTriggerName(name: string): TriggerName {
	if (!name || name.trim().length === 0) {
		throw new Error('Trigger name cannot be empty');
	}
	return name;
}

/**
 * Function that determines whether a trigger should activate
 */
export interface TriggerCondition {
	(message: Message): Promise<boolean> | boolean;
}
/**
 * Function that generates a response message
 */
export interface ResponseGenerator {
	(message: Message): Promise<string> | string;
}

/**
 * Function or value that provides a bot identity
 */
export type IdentityProvider = BotIdentity | ((message: Message) => Promise<BotIdentity> | BotIdentity);

/**
 * Priority level for trigger execution order
 */
export type Priority = number;

export function createPriority(value: number): Priority {
	if (value < 0) {
		throw new Error('Priority must be a non-negative number');
	}
	return value;
}

/**
 * Complete trigger-response definition with strong typing
 */
export interface TriggerResponse {
	name: TriggerName;
	condition: TriggerCondition;
	response: ResponseGenerator;
	identity?: IdentityProvider;
	priority?: Priority;
	botName?: string;
}

/**
 * Configuration for creating a new TriggerResponse
 */
export interface TriggerResponseConfig {
	name: string;
	condition: TriggerCondition;
	response: ResponseGenerator;
	identity?: IdentityProvider;
	priority?: number;
	botName?: string;
}

// Class representing a single trigger-response pair
export class TriggerResponseClass {
	public readonly name: TriggerName;
	public readonly condition: TriggerCondition;
	public readonly response: ResponseGenerator;
	public readonly priority: Priority;
	private readonly identity?: IdentityProvider;
	private readonly botName: string;

	constructor(config: TriggerResponseConfig & { botName: string }) {
		this.name = createTriggerName(config.name);
		this.botName = config.botName;
		// Wrap the condition with default bot behavior
		this.condition = withDefaultBotBehavior(this.botName, config.condition);
		this.response = config.response;
		this.identity = config.identity;
		this.priority = createPriority(config.priority || 0);
	}

	// Check if this trigger matches the message
	public async matches(message: Message): Promise<boolean> {
		try {
			return this.condition(message);
		} catch (error) {
			logger.error('Error in condition evaluation', error as Error);
			return false;
		}
	}

	// Get the identity to use for this response
	public async getIdentity(message: Message, defaultIdentity: BotIdentity): Promise<BotIdentity> {
		if (!this.identity) {
			return defaultIdentity;
		}

		try {
			if (typeof this.identity === 'function') {
				const result = await this.identity(message);
				return result;
			}
			return this.identity;
		} catch (error) {
			logger.error(`[TriggerResponse:${this.name}] Error getting identity:`, error as Error);
			return defaultIdentity;
		}
	}

	// Process the message and send a response if conditions match
	public async process(
		message: Message,
		defaultIdentity: BotIdentity,
		botName: string,
	): Promise<boolean> {
		try {
			const matches = await this.matches(message);

			if (!matches) {
				return false;
			}

			logger.debug(`[${botName}] Trigger "${this.name}" matched`);

			// Get identity for this response
			const identity = await this.getIdentity(message, defaultIdentity);

			// Generate and send response
			const responseText = await this.response(message);
			const channel = message.channel;

			logger.debug(`[${botName}] Sending response: "${responseText.substring(0, 100)}..."`);

			// Use the discord service to send the message
			// Use pre-imported DiscordService for better performance
			await DiscordService.getInstance().sendMessageWithBotIdentity(
				channel.id,
				identity,
				responseText
			);

			return true;
		} catch (error) {
			logger.error(`[TriggerResponse:${this.name}] Error processing:`, error as Error);
			throw error;
		}
	}
}

// Factory function to create a trigger-response pair with validation
export function createTriggerResponse(config: TriggerResponseConfig): TriggerResponse {
	return {
		name: createTriggerName(config.name),
		condition: config.condition,
		response: config.response,
		identity: config.identity,
		priority: config.priority !== undefined ? createPriority(config.priority) : createPriority(0),
		botName: config.botName
	};
}
