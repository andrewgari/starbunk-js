import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import guildIds from '../../discord/guildIds';
import userId from '../../discord/userId';
import { isDebugMode } from '../../environment';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';

export default abstract class ReplyBot {
	protected skipBotMessages: boolean = true;

	/**
	 * Get the default name for this bot. By default, returns the class name.
	 * Can be overridden if a different name is needed.
	 */
	public get defaultBotName(): string {
		return this.constructor.name;
	}

	public abstract get botIdentity(): BotIdentity | undefined;

	public async auditMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Auditing message from ${message.author.tag}`);

		// Early return if message should be skipped
		if (this.shouldSkipMessage(message)) {
			logger.debug(`[${this.defaultBotName}] Skipping message from ${message.author.tag} (shouldSkipMessage=true)`);
			return;
		}

		try {
			await this.handleMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error handling message`, error as Error);
			logger.debug(`[${this.defaultBotName}] Message content that caused error: "${message.content.substring(0, 100)}..."`);
		}
	}

	public async handleMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Handling message from ${message.author.tag}`);

		// Skip bot messages if skipBotMessages is true
		if (this.shouldSkipMessage(message)) {
			logger.debug(`[${this.defaultBotName}] Skipping message from ${message.author.tag} (shouldSkipMessage=true)`);
			return;
		}

		try {
			await this.processMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message`, error as Error);
			logger.debug(`[${this.defaultBotName}] Message content that caused error: "${message.content.substring(0, 100)}..."`);
		}
	}

	protected abstract processMessage(message: Message): Promise<void>;

	/**
	 * Check if a message should be skipped (e.g., from a bot)
	 * @param message The message to check
	 * @returns true if the message should be skipped, false otherwise
	 */
	protected shouldSkipMessage(message: Message): boolean {
		// Skip messages from any bot if skipBotMessages is true
		if (this.skipBotMessages && message.author.bot) {
			logger.debug(`[${this.defaultBotName}] Skipping message from bot (skipBotMessages=true)`);
			return true;
		}

		// In debug mode, only process messages from Cova or in the testing channel
		if (isDebugMode()) {
			// log message details
			logger.debug(`[${this.defaultBotName}] DEBUG MODE - Message details:
				Author: ${message.author.tag} (ID: ${message.author.id})
				Channel: ${message.channel.type === 0 ? message.channel.name : 'DM/unknown'} (ID: ${message.channelId})
				Guild: ${message.guild?.name} (ID: ${message.guild?.id})
			`);

			// Skip messages from Starbunk guild
			logger.debug(`[${this.defaultBotName}] DEBUG MODE - Message guild ID: ${message.guild?.id}`);
			if (message.guild?.id === guildIds.StarbunkCrusaders) {
				return true;
			}

			// Skip messages from Cova
			logger.debug(`[${this.defaultBotName}] DEBUG MODE - Message author ID: ${message.author.id}`);
			if (message.author.id === userId.Cova) {
				return true;
			}
		}

		return false;
	}

	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		try {
			const identity = this.botIdentity;

			if (!identity) {
				logger.warn(`[${this.defaultBotName}] No bot identity available, using default name`);
				// Continue with a generic identity
			}

			// Try to use webhook service
			try {
				const webhookService = getWebhookService();
				logger.debug(`[${this.defaultBotName}] Got webhook service successfully`);

				logger.debug(`[${this.defaultBotName}] Sending reply to channel ${channel.name}: "${content.substring(0, 100)}..."`);
				await webhookService.writeMessage(channel, {
					username: identity?.botName || this.defaultBotName,
					avatarURL: identity?.avatarUrl,
					content: content,
					embeds: []
				});
				logger.debug(`[${this.defaultBotName}] Reply sent successfully via webhook`);
				return; // Success, exit early
			} catch (error) {
				// Just log the webhook error, we'll fall back to direct channel message
				logger.warn(`[${this.defaultBotName}] Failed to use webhook service, falling back to direct message: ${error instanceof Error ? error.message : String(error)}`);
			}

			// Fallback to direct channel message
			logger.debug(`[${this.defaultBotName}] Sending fallback direct message to channel ${channel.name}`);
			const formattedMessage = `**[${identity?.botName || this.defaultBotName}]**: ${content}`;
			await channel.send(formattedMessage);
			logger.debug(`[${this.defaultBotName}] Fallback direct message sent successfully`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Failed to send any reply to channel ${channel.id}: ${error instanceof Error ? error.message : String(error)}`);
			// Don't throw here - just log the error and continue
		}
	}

	public isSelf(message: Message): boolean {
		const isSelf = message.author.bot && message.author.id === message.client.user?.id;
		logger.debug(`[${this.defaultBotName}] Checking if message is from self: ${isSelf}`);
		return isSelf;
	}

	public isBot(message: Message): boolean {
		const isBot = message.author.bot;
		logger.debug(`[${this.defaultBotName}] Checking if message is from bot: ${isBot}`);
		return isBot;
	}
}
