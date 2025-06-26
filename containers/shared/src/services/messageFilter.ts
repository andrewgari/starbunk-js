// Message filtering service for testing and debug configurations
import { logger } from './logger';
import { getTestingServerIds, getTestingChannelIds, getDebugMode } from '../utils/envValidation';

export interface MessageContext {
	serverId?: string;
	channelId: string;
	userId: string;
	username: string;
	content?: string;
}

export interface FilterResult {
	allowed: boolean;
	reason?: string;
}

export class MessageFilter {
	private testingServerIds: string[];
	private testingChannelIds: string[];
	private debugMode: boolean;

	constructor() {
		this.testingServerIds = getTestingServerIds();
		this.testingChannelIds = getTestingChannelIds();
		this.debugMode = getDebugMode();

		this.logConfiguration();
	}

	private logConfiguration(): void {
		logger.info('🔧 Message Filter Configuration:');
		logger.info(`  Debug Mode: ${this.debugMode}`);
		logger.info(`  Testing Server IDs: ${this.testingServerIds.length > 0 ? this.testingServerIds.join(', ') : 'None (all servers allowed)'}`);
		logger.info(`  Testing Channel IDs: ${this.testingChannelIds.length > 0 ? this.testingChannelIds.join(', ') : 'None (all channels allowed)'}`);
	}

	/**
	 * Checks if a message should be processed based on server and channel restrictions
	 */
	public shouldProcessMessage(context: MessageContext): FilterResult {
		// Check server restriction
		if (this.testingServerIds.length > 0 && context.serverId) {
			if (!this.testingServerIds.includes(context.serverId)) {
				const reason = `Server ${context.serverId} not in allowed testing servers`;
				this.logFilterDecision(context, false, reason);
				return { allowed: false, reason };
			}
		}

		// Check channel restriction
		if (this.testingChannelIds.length > 0) {
			if (!this.testingChannelIds.includes(context.channelId)) {
				const reason = `Channel ${context.channelId} not in allowed testing channels`;
				this.logFilterDecision(context, false, reason);
				return { allowed: false, reason };
			}
		}

		// Message passes all filters
		this.logFilterDecision(context, true);
		return { allowed: true };
	}

	/**
	 * Logs filtering decisions when debug mode is enabled
	 */
	private logFilterDecision(context: MessageContext, allowed: boolean, reason?: string): void {
		if (!this.debugMode) return;

		const action = allowed ? '✅ ALLOWED' : '❌ BLOCKED';
		const serverInfo = context.serverId ? `Server: ${context.serverId}` : 'DM';
		const channelInfo = `Channel: ${context.channelId}`;
		const userInfo = `User: ${context.username} (${context.userId})`;
		
		logger.debug(`${action} Message - ${serverInfo}, ${channelInfo}, ${userInfo}`);
		
		if (reason) {
			logger.debug(`  Reason: ${reason}`);
		}

		if (context.content && this.debugMode) {
			const truncatedContent = context.content.length > 100 
				? context.content.substring(0, 100) + '...' 
				: context.content;
			logger.debug(`  Content: "${truncatedContent}"`);
		}
	}

	/**
	 * Checks if debug mode is enabled
	 */
	public isDebugMode(): boolean {
		return this.debugMode;
	}

	/**
	 * Gets the current testing server IDs
	 */
	public getTestingServerIds(): string[] {
		return [...this.testingServerIds];
	}

	/**
	 * Gets the current testing channel IDs
	 */
	public getTestingChannelIds(): string[] {
		return [...this.testingChannelIds];
	}

	/**
	 * Refreshes the configuration from environment variables
	 * Useful for runtime configuration changes
	 */
	public refreshConfiguration(): void {
		this.testingServerIds = getTestingServerIds();
		this.testingChannelIds = getTestingChannelIds();
		this.debugMode = getDebugMode();
		
		logger.info('🔄 Message Filter configuration refreshed');
		this.logConfiguration();
	}

	/**
	 * Creates a MessageContext from a Discord.js Message object
	 */
	public static createContextFromMessage(message: any): MessageContext {
		return {
			serverId: message.guild?.id,
			channelId: message.channel.id,
			userId: message.author.id,
			username: message.author.username,
			content: message.content
		};
	}

	/**
	 * Creates a MessageContext from a Discord.js Interaction object
	 */
	public static createContextFromInteraction(interaction: any): MessageContext {
		return {
			serverId: interaction.guild?.id,
			channelId: interaction.channel?.id || interaction.channelId,
			userId: interaction.user.id,
			username: interaction.user.username,
			content: interaction.commandName
		};
	}
}

// Singleton instance
let messageFilterInstance: MessageFilter | null = null;

/**
 * Gets the singleton MessageFilter instance
 */
export function getMessageFilter(): MessageFilter {
	if (!messageFilterInstance) {
		messageFilterInstance = new MessageFilter();
	}
	return messageFilterInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetMessageFilter(): void {
	messageFilterInstance = null;
}
