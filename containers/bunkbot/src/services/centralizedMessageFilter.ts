/**
 * Centralized Message Filter Service for Discord Bot Reply Pipeline
 * 
 * This service provides a single unified function that determines whether incoming 
 * Discord messages should be processed by the reply-bot evaluation pipeline or ignored entirely.
 */

import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';

/**
 * Configuration interface for message filtering
 */
export interface MessageFilterConfig {
	/** Current bot's user ID to prevent self-triggering */
	currentBotUserId?: string;
	/** List of bot user IDs that are whitelisted to bypass bot filtering */
	whitelistedBotIds: string[];
	/** Special bot names that have inverse behavior (only respond to bots) */
	inverseBehaviorBots: string[];
	/** Enable debug logging for filtering decisions */
	debugMode: boolean;
}

/**
 * Result of message filtering evaluation
 */
export interface MessageFilterResult {
	/** Whether the message should be processed */
	shouldProcess: boolean;
	/** Reason for the filtering decision */
	reason: string;
	/** Whether this was a bot message */
	wasBotMessage: boolean;
	/** The bot that should handle this message (for inverse behavior bots) */
	targetBot?: string;
}

/**
 * Centralized message filtering service
 */
export class CentralizedMessageFilter {
	private config: MessageFilterConfig;

	constructor(config: MessageFilterConfig) {
		this.config = config;
		this.logConfiguration();
	}

	/**
	 * Main filtering function - determines if a message should be processed
	 */
	public shouldProcessMessage(message: Message, requestingBotName?: string): MessageFilterResult {
		const messageInfo = {
			authorId: message.author.id,
			authorName: message.author.username,
			isBot: message.author.bot,
			content: this.truncateContent(message.content)
		};

		// 1. Self-trigger prevention - highest priority
		if (this.config.currentBotUserId && message.author.id === this.config.currentBotUserId) {
			const result: MessageFilterResult = {
				shouldProcess: false,
				reason: 'Self-trigger prevention: Message from current bot',
				wasBotMessage: message.author.bot,
			};
			this.logFilterDecision(messageInfo, result, requestingBotName);
			return result;
		}

		// 2. Handle inverse behavior bots (BotBot)
		if (requestingBotName && this.config.inverseBehaviorBots.includes(requestingBotName)) {
			return this.handleInverseBehaviorBot(message, messageInfo, requestingBotName);
		}

		// 3. Handle regular bots - check if it's a bot message
		if (message.author.bot) {
			return this.handleBotMessage(message, messageInfo, requestingBotName);
		}

		// 4. Regular user message - allow processing
		const result: MessageFilterResult = {
			shouldProcess: true,
			reason: 'Regular user message',
			wasBotMessage: false,
		};
		this.logFilterDecision(messageInfo, result, requestingBotName);
		return result;
	}

	/**
	 * Handle messages for bots with inverse behavior (only respond to other bots)
	 */
	private handleInverseBehaviorBot(
		message: Message, 
		messageInfo: any, 
		requestingBotName: string
	): MessageFilterResult {
		if (!message.author.bot) {
			// Inverse behavior bot should ignore user messages
			const result: MessageFilterResult = {
				shouldProcess: false,
				reason: `Inverse behavior bot '${requestingBotName}' ignores user messages`,
				wasBotMessage: false,
			};
			this.logFilterDecision(messageInfo, result, requestingBotName);
			return result;
		}

		// It's a bot message - check if we should process it
		return this.handleBotMessage(message, messageInfo, requestingBotName, true);
	}

	/**
	 * Handle messages from Discord bots
	 */
	private handleBotMessage(
		message: Message, 
		messageInfo: any, 
		requestingBotName?: string,
		isInverseBehaviorBot: boolean = false
	): MessageFilterResult {
		// Check whitelist first
		if (this.config.whitelistedBotIds.includes(message.author.id)) {
			const result: MessageFilterResult = {
				shouldProcess: true,
				reason: `Bot ${message.author.username} (${message.author.id}) is whitelisted`,
				wasBotMessage: true,
			};
			this.logFilterDecision(messageInfo, result, requestingBotName);
			return result;
		}

		// Apply default bot filtering behavior
		if (isInverseBehaviorBot) {
			// Inverse behavior bot should process non-whitelisted bot messages
			// but we still want to exclude certain problematic bots
			if (this.shouldExcludeBotFromProcessing(message)) {
				const result: MessageFilterResult = {
					shouldProcess: false,
					reason: `Bot ${message.author.username} is excluded from processing`,
					wasBotMessage: true,
				};
				this.logFilterDecision(messageInfo, result, requestingBotName);
				return result;
			}

			const result: MessageFilterResult = {
				shouldProcess: true,
				reason: `Inverse behavior bot processing bot message from ${message.author.username}`,
				wasBotMessage: true,
			};
			this.logFilterDecision(messageInfo, result, requestingBotName);
			return result;
		}

		// Default behavior: ignore bot messages
		const result: MessageFilterResult = {
			shouldProcess: false,
			reason: `Default bot filtering: ignoring message from bot ${message.author.username}`,
			wasBotMessage: true,
		};
		this.logFilterDecision(messageInfo, result, requestingBotName);
		return result;
	}

	/**
	 * Determine if a bot should be excluded from processing (CovaBot, etc.)
	 */
	private shouldExcludeBotFromProcessing(message: Message): boolean {
		const botName = message.author.username?.toLowerCase() || '';
		const displayName = message.member?.displayName?.toLowerCase() || '';

		// Exclude CovaBot and its variants
		const excludedPatterns = [
			'covabot',
			'cova-bot', 
			'cova_bot'
		];

		return excludedPatterns.some(pattern => 
			botName.includes(pattern) || displayName.includes(pattern)
		);
	}

	/**
	 * Update the configuration
	 */
	public updateConfig(newConfig: Partial<MessageFilterConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.logConfiguration();
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): MessageFilterConfig {
		return { ...this.config };
	}

	/**
	 * Log filtering decisions when debug mode is enabled
	 */
	private logFilterDecision(
		messageInfo: any, 
		result: MessageFilterResult, 
		requestingBot?: string
	): void {
		if (!this.config.debugMode) return;

		const action = result.shouldProcess ? '✅ ALLOWED' : '❌ BLOCKED';
		const botInfo = requestingBot ? `[${requestingBot}]` : '[GLOBAL]';
		
		logger.debug(`${botInfo} ${action} Message from ${messageInfo.authorName} (${messageInfo.authorId})`);
		logger.debug(`  Bot: ${messageInfo.isBot}, Reason: ${result.reason}`);
		
		if (messageInfo.content) {
			logger.debug(`  Content: "${messageInfo.content}"`);
		}
	}

	/**
	 * Log current configuration
	 */
	private logConfiguration(): void {
		if (!this.config.debugMode) return;

		logger.info('🔧 Centralized Message Filter Configuration:');
		logger.info(`  Debug Mode: ${this.config.debugMode}`);
		logger.info(`  Current Bot ID: ${this.config.currentBotUserId || 'Not set'}`);
		logger.info(`  Whitelisted Bot IDs: ${this.config.whitelistedBotIds.length > 0 ? this.config.whitelistedBotIds.join(', ') : 'None'}`);
		logger.info(`  Inverse Behavior Bots: ${this.config.inverseBehaviorBots.length > 0 ? this.config.inverseBehaviorBots.join(', ') : 'None'}`);
	}

	/**
	 * Truncate message content for logging
	 */
	private truncateContent(content: string): string {
		if (!content) return '';
		return content.length > 100 ? content.substring(0, 100) + '...' : content;
	}
}

/**
 * Factory function to create message filter from environment variables
 */
export function createMessageFilterFromEnv(): CentralizedMessageFilter {
	const config: MessageFilterConfig = {
		currentBotUserId: undefined, // Will be set when bot is ready
		whitelistedBotIds: parseCommaSeparatedEnv('BOT_WHITELIST_IDS'),
		inverseBehaviorBots: parseCommaSeparatedEnv('INVERSE_BEHAVIOR_BOTS', ['BotBot']),
		debugMode: process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
	};

	return new CentralizedMessageFilter(config);
}

/**
 * Helper function to parse comma-separated environment variables
 */
function parseCommaSeparatedEnv(envVar: string, defaultValue: string[] = []): string[] {
	const value = process.env[envVar];
	if (!value) return defaultValue;
	
	return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

// Export singleton instance
let messageFilterInstance: CentralizedMessageFilter | null = null;

/**
 * Get the singleton centralized message filter instance
 */
export function getCentralizedMessageFilter(): CentralizedMessageFilter {
	if (!messageFilterInstance) {
		messageFilterInstance = createMessageFilterFromEnv();
	}
	return messageFilterInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetCentralizedMessageFilter(): void {
	messageFilterInstance = null;
}