// Message filtering service for testing and debug configurations
import { logger, getTestingServerIds, getTestingChannelIds, getDebugMode } from '@starbunk/shared';

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
		logger.info(
			`  Testing Server IDs: ${this.testingServerIds.length > 0 ? this.testingServerIds.join(', ') : 'None (all servers allowed)'}`,
		);
		logger.info(
			`  Testing Channel IDs: ${this.testingChannelIds.length > 0 ? this.testingChannelIds.join(', ') : 'None (all channels allowed)'}`,
		);
	}

	/**
	 * Checks if a message should be processed based on server and channel restrictions
	 * Implements the following logic:
	 * 1. Guild-only filtering: If TESTING_SERVER_IDS is specified but TESTING_CHANNEL_IDS is not,
	 *    bots should only post in the specified guild(s)
	 * 2. Channel-only filtering: If TESTING_CHANNEL_IDS is specified but TESTING_SERVER_IDS is not,
	 *    bots should only post in the specified channel(s) regardless of guild
	 * 3. Combined filtering: If both are specified, Guild-level takes precedence:
	 *    - If guild is whitelisted: ALL channels in that guild are allowed
	 *    - If guild is not whitelisted: only whitelisted channels are allowed
	 * 4. No filtering: If neither are specified, bots should post normally without restrictions
	 */
	public shouldProcessMessage(context: MessageContext): FilterResult {
		const hasServerRestriction = this.testingServerIds.length > 0;
		const hasChannelRestriction = this.testingChannelIds.length > 0;

		// Case 4: No filtering - allow all messages
		if (!hasServerRestriction && !hasChannelRestriction) {
			this.logFilterDecision(context, true, 'No restrictions configured');
			return { allowed: true };
		}

		// Case 1: Guild-only filtering
		if (hasServerRestriction && !hasChannelRestriction) {
			if (!context.serverId) {
				// DM messages are allowed even when server restrictions are active
				this.logFilterDecision(context, true, 'DM message allowed despite server restrictions');
				return { allowed: true };
			}

			if (!this.testingServerIds.includes(context.serverId)) {
				const reason = `Server ${context.serverId} not in allowed testing servers: [${this.testingServerIds.join(', ')}]`;
				this.logFilterDecision(context, false, reason);
				return { allowed: false, reason };
			}

			this.logFilterDecision(context, true, 'Server restriction passed');
			return { allowed: true };
		}

		// Case 2: Channel-only filtering
		if (!hasServerRestriction && hasChannelRestriction) {
			if (!this.testingChannelIds.includes(context.channelId)) {
				const reason = `Channel ${context.channelId} not in allowed testing channels: [${this.testingChannelIds.join(', ')}]`;
				this.logFilterDecision(context, false, reason);
				return { allowed: false, reason };
			}

			this.logFilterDecision(context, true, 'Channel restriction passed');
			return { allowed: true };
		}

		// Case 3: Combined filtering - Guild-level takes precedence over channel-level
		if (hasServerRestriction && hasChannelRestriction) {
			// First check server restriction
			if (!context.serverId) {
				// DM messages: only allow if channel is specifically whitelisted
				if (this.testingChannelIds.includes(context.channelId)) {
					this.logFilterDecision(context, true, 'DM message allowed - channel is whitelisted');
					return { allowed: true };
				}
				const reason = 'Message is from DM, but channel is not in allowed testing channels';
				this.logFilterDecision(context, false, reason);
				return { allowed: false, reason };
			}

			// Guild-level whitelist takes precedence: if guild is whitelisted, allow ALL channels in that guild
			if (this.testingServerIds.includes(context.serverId)) {
				this.logFilterDecision(
					context,
					true,
					'Guild-level whitelist takes precedence - all channels in this guild are allowed',
				);
				return { allowed: true };
			}

			// Guild is not whitelisted: only allow if channel is specifically whitelisted
			if (this.testingChannelIds.includes(context.channelId)) {
				this.logFilterDecision(context, true, 'Channel-level whitelist allows this specific channel');
				return { allowed: true };
			}

			const reason = `Guild ${context.serverId} not in allowed testing servers and channel ${context.channelId} not in allowed testing channels`;
			this.logFilterDecision(context, false, reason);
			return { allowed: false, reason };
		}

		// This should never be reached, but provide a safe fallback
		this.logFilterDecision(context, false, 'Unknown filtering state');
		return { allowed: false, reason: 'Unknown filtering state' };
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
			const truncatedContent =
				context.content.length > 100 ? context.content.substring(0, 100) + '...' : context.content;
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
			content: message.content,
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
			content: interaction.commandName,
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
