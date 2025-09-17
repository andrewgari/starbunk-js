import { Message } from 'discord.js';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { getMetrics, getStructuredLogger, ChannelActivity } from './index';

interface ChannelStats {
	channelId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	messageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	userSet: Set<string>; // eslint-disable-line @typescript-eslint/no-unused-vars
	botMessageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	humanMessageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	lastActivity: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	recentUsers: string[]; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export class ChannelActivityTracker {
	private channelStats = new Map<string, ChannelStats>();
	private updateInterval?: NodeJS.Timeout;
	private readonly updateIntervalMs = 60000; // Update metrics every minute

	constructor() {
		this.startPeriodicUpdates();
	}

	trackMessage(message: Message): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const channelId = message.channel.id;
			const guildId = message.guild?.id || 'dm';
			const channelName = 'name' in message.channel ? message.channel.name || 'unknown' : 'dm';
			const userId = message.author.id;
			const isBot = message.author.bot;

			let stats = this.channelStats.get(channelId);

			if (!stats) {
				stats = {
					channelId,
					channelName,
					guildId,
					messageCount: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
					userSet: new Set(), // eslint-disable-line @typescript-eslint/no-unused-vars
					botMessageCount: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
					humanMessageCount: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
					lastActivity: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
					recentUsers: [], // eslint-disable-line @typescript-eslint/no-unused-vars
				};
				this.channelStats.set(channelId, stats);
			}

			// Update stats
			stats.messageCount++;
			stats.userSet.add(userId);
			stats.lastActivity = Date.now();

			if (isBot) {
				stats.botMessageCount++;
			} else {
				stats.humanMessageCount++;
			}

			// Track recent users (last 10)
			if (!stats.recentUsers.includes(userId)) {
				stats.recentUsers.unshift(userId);
				if (stats.recentUsers.length > 10) {
					stats.recentUsers = stats.recentUsers.slice(0, 10);
				}
			}
		} catch (error) {
			logger.warn('Failed to track channel activity:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	private startPeriodicUpdates(): void {
		this.updateInterval = setInterval(() => {
			this.updateMetrics();
			this.cleanupOldChannels();
		}, this.updateIntervalMs);

		logger.info('Channel activity tracker started');
	}

	private updateMetrics(): void {
		try {
			const metrics = getMetrics();
			const structuredLogger = getStructuredLogger();
			const _now = Date.now();

			for (const [_channelId, stats] of this.channelStats.entries()) {
				// Calculate messages per minute
				const messagesPerMinute = stats.messageCount;
				const activeUsers = stats.userSet.size;
				const _botRatio = stats.messageCount > 0 ? stats.botMessageCount / stats.messageCount : 0;

				const channelActivity: ChannelActivity = {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					channelId: stats.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
					channelName: stats.channelName, // eslint-disable-line @typescript-eslint/no-unused-vars
					guildId: stats.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					messageCount: messagesPerMinute, // eslint-disable-line @typescript-eslint/no-unused-vars
					userCount: activeUsers, // eslint-disable-line @typescript-eslint/no-unused-vars
					botMessageCount: stats.botMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
					humanMessageCount: stats.humanMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
					timestamp: _now, // eslint-disable-line @typescript-eslint/no-unused-vars
				};

				// Track metrics
				metrics.trackChannelActivity(channelActivity);

				// Log structured activity data
				structuredLogger.logChannelActivity({
					event: 'channel_activity', // eslint-disable-line @typescript-eslint/no-unused-vars
					channel_id: stats.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
					channel_name: stats.channelName, // eslint-disable-line @typescript-eslint/no-unused-vars
					guild_id: stats.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					message_count: messagesPerMinute, // eslint-disable-line @typescript-eslint/no-unused-vars
					user_count: activeUsers, // eslint-disable-line @typescript-eslint/no-unused-vars
					bot_message_count: stats.botMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
					human_message_count: stats.humanMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
					active_users: stats.recentUsers, // eslint-disable-line @typescript-eslint/no-unused-vars
					timestamp: new Date(_now).toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
				});

				// Reset counters for next interval
				stats.messageCount = 0;
				stats.botMessageCount = 0;
				stats.humanMessageCount = 0;
				stats.userSet.clear();
			}
		} catch (error) {
			logger.error('Failed to update channel metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	private cleanupOldChannels(): void {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

		for (const [channelId, stats] of this.channelStats.entries()) {
			if (stats.lastActivity < cutoff) {
				this.channelStats.delete(channelId);
				logger.debug(`Cleaned up inactive channel: ${stats.channelName} (${channelId})`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	}

	getChannelStats(): Record<string, Omit<ChannelStats, 'userSet'>> {
		const _result: Record<string, Omit<ChannelStats, 'userSet'>> = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

		for (const [channelId, stats] of this.channelStats.entries()) {
			_result[channelId] = {
				channelId: stats.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channelName: stats.channelName, // eslint-disable-line @typescript-eslint/no-unused-vars
				guildId: stats.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				messageCount: stats.messageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
				botMessageCount: stats.botMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
				humanMessageCount: stats.humanMessageCount, // eslint-disable-line @typescript-eslint/no-unused-vars
				lastActivity: stats.lastActivity, // eslint-disable-line @typescript-eslint/no-unused-vars
				recentUsers: [...stats.recentUsers], // eslint-disable-line @typescript-eslint/no-unused-vars
			};
		}

		return _result;
	}

	shutdown(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = undefined;
		}

		// Final metrics update
		this.updateMetrics();

		logger.info('Channel activity tracker shutdown');
	}
}

// Global channel activity tracker
let globalChannelTracker: ChannelActivityTracker | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

export function initializeChannelActivityTracker(): ChannelActivityTracker {
	if (globalChannelTracker) {
		logger.warn('Channel activity tracker already initialized');
		return globalChannelTracker;
	}

	globalChannelTracker = new ChannelActivityTracker();
	logger.info('Channel activity tracker initialized');
	return globalChannelTracker;
}

export function getChannelActivityTracker(): ChannelActivityTracker {
	if (!globalChannelTracker) {
		throw new Error('Channel activity tracker not initialized. Call initializeChannelActivityTracker() first.');
	}
	return globalChannelTracker;
}
