import { logger, ensureError } from '@starbunk/shared';
import { DiscordService } from '@starbunk/shared/dist/services/discordService';
import { Message } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { ValidatedReplyBotConfig } from './bot-builder';

export class BotProcessor {
	constructor(private config: ValidatedReplyBotConfig) {}

	async shouldRespond(message: Message): Promise<boolean> {
		if (this.config.disabled) return false;
		if (!this.passesResponseRate()) return false;
		if (await this.shouldSkipMessage(message)) return false;

		return this.hasTriggerMatch(message);
	}

	async processMessage(message: Message): Promise<void> {
		if (!(await this.shouldRespond(message))) return;
		if (this.isBlacklisted(message)) return;

		const trigger = await this.findMatchingTrigger(message);
		if (!trigger) return;

		try {
			const response = await this.generateResponse(trigger, message);
			if (response) {
				await this.sendResponse(response, message);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Error processing message:`, ensureError(error));
		}
	}

	private passesResponseRate(): boolean {
		if (this.config.defaultResponseRate <= 0) return false;
		return Math.random() * 100 <= this.config.defaultResponseRate;
	}

	private async shouldSkipMessage(message: Message): Promise<boolean> {
		return await this.config.messageFilter(message);
	}

	private async hasTriggerMatch(message: Message): Promise<boolean> {
		const triggers = this.getSortedTriggers();
		
		for (const trigger of triggers) {
			try {
				if (await trigger.condition(message)) {
					return true;
				}
			} catch (error) {
				logger.debug(`[${this.config.name}] Error in trigger "${trigger.name}":`, error);
			}
		}
		
		return false;
	}

	private isBlacklisted(message: Message): boolean {
		const guildId = message.guild?.id;
		const userId = message.author.id;
		
		if (!guildId) return false;
		
		const blacklistKey = `blacklist:${guildId}:${userId}`;
		return !!getBotData(this.config.name, blacklistKey);
	}

	private async findMatchingTrigger(message: Message): Promise<TriggerResponse | null> {
		const triggers = this.getSortedTriggers();
		
		for (const trigger of triggers) {
			try {
				if (await trigger.condition(message)) {
					return trigger;
				}
			} catch (error) {
				logger.debug(`[${this.config.name}] Trigger error "${trigger.name}":`, error);
			}
		}
		
		return null;
	}

	private async generateResponse(trigger: TriggerResponse, message: Message): Promise<{
		text: string;
		identity: BotIdentity;
	} | null> {
		const responseText = await trigger.response(message);
		if (!responseText) return null;

		const identity = await this.resolveIdentity(trigger, message);
		if (!identity) return null;

		return { text: responseText, identity };
	}

	private async resolveIdentity(trigger: TriggerResponse, message: Message): Promise<BotIdentity | null> {
		try {
			const identity = typeof trigger.identity === 'function'
				? await trigger.identity(message)
				: trigger.identity || this.config.defaultIdentity;

			if (!identity) {
				logger.debug(`[${this.config.name}] No identity resolved for trigger "${trigger.name}"`);
				return null;
			}

			return identity;
		} catch (error) {
			logger.error(`[${this.config.name}] Identity resolution failed:`, ensureError(error));
			return null;
		}
	}

	private async sendResponse(response: { text: string; identity: BotIdentity }, message: Message): Promise<void> {
		try {
			const discordService = await this.getDiscordService();
			
			if (discordService) {
				await discordService.sendMessageWithBotIdentity(
					message.channel.id,
					response.identity,
					response.text
				);
				logger.debug(`[${this.config.name}] Sent message as ${response.identity.botName}`);
			} else {
				await this.sendFallbackMessage(message, response.text);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Failed to send response:`, ensureError(error));
			await this.sendFallbackMessage(message, response.text);
		}
	}

	private async getDiscordService(): Promise<DiscordService | null> {
		if (this.config.discordService) {
			return this.config.discordService;
		}

		try {
			const { container, ServiceId } = await import('@starbunk/shared');
			return container.get(ServiceId.DiscordService);
		} catch (error) {
			logger.debug('Could not get DiscordService from container:', error);
			return null;
		}
	}

	private async sendFallbackMessage(message: Message, text: string): Promise<void> {
		try {
			if ('send' in message.channel) {
				await message.channel.send(text);
				logger.debug(`[${this.config.name}] Sent fallback message`);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Fallback message failed:`, ensureError(error));
		}
	}

	private getSortedTriggers(): TriggerResponse[] {
		return [...this.config.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
	}
}

// Simple in-memory storage for bot data (replaces Prisma for now)
const botStorage = new Map<string, string | number | boolean>();

function getBotData(botName: string, key: string): string | number | boolean | undefined {
	return botStorage.get(`${botName}:${key}`);
}

export function setBotData(botName: string, key: string, value: string | number | boolean): void {
	botStorage.set(`${botName}:${key}`, value);
}