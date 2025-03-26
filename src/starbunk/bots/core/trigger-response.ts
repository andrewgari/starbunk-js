import { Message } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';

export interface TriggerCondition {
	(message: Message): Promise<boolean> | boolean;
}

export interface ResponseGenerator {
	(message: Message): Promise<string> | string;
}

export interface TriggerResponse {
	name: string;
	condition: TriggerCondition;
	response: ResponseGenerator;
	identity?: BotIdentity | ((message: Message) => Promise<BotIdentity> | BotIdentity);
	priority?: number; // Higher numbers = higher priority
}

// Class representing a single trigger-response pair
export class TriggerResponseClass {
	public readonly name: string;
	public readonly condition: TriggerCondition;
	public readonly response: ResponseGenerator;
	public readonly priority: number;
	private readonly identity?: BotIdentity | ((message: Message) => Promise<BotIdentity> | BotIdentity);

	constructor(config: TriggerResponse) {
		this.name = config.name;
		this.condition = config.condition;
		this.response = config.response;
		this.identity = config.identity;
		this.priority = config.priority || 0;
	}

	// Check if this trigger matches the message
	public async matches(message: Message): Promise<boolean> {
		try {
			return await this.condition(message);
		} catch (error) {
			logger.error(`[TriggerResponse:${this.name}] Error in condition evaluation:`, error as Error);
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
			const DiscordService = (await import('../../../services/discordService.js')).DiscordService;
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

// Factory function to create a trigger-response pair
export function createTriggerResponse(config: TriggerResponse): TriggerResponse {
	return {
		...config,
		priority: config.priority ?? 0
	};
}
