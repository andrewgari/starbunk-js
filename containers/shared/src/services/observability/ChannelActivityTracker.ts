import { Message } from 'discord.js';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { getMetrics, getStructuredLogger, ChannelActivity } from './index';

interface ChannelStats {
    channelId: string;
    channelName: string;
    guildId: string;
    messageCount: number;
    userSet: Set<string>;
    botMessageCount: number;
    humanMessageCount: number;
    lastActivity: number;
    recentUsers: string[];
}

export class ChannelActivityTracker {
    private channelStats = new Map<string, ChannelStats>();
    private updateInterval?: NodeJS.Timeout;
    private readonly updateIntervalMs = 60000; // Update metrics every minute
    
    constructor() {
        this.startPeriodicUpdates();
    }

    trackMessage(message: Message): void {
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
                    messageCount: 0,
                    userSet: new Set(),
                    botMessageCount: 0,
                    humanMessageCount: 0,
                    lastActivity: Date.now(),
                    recentUsers: []
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
            logger.warn('Failed to track channel activity:', ensureError(error));
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
            const now = Date.now();

            for (const [channelId, stats] of this.channelStats.entries()) {
                // Calculate messages per minute
                const messagesPerMinute = stats.messageCount;
                const activeUsers = stats.userSet.size;
                const botRatio = stats.messageCount > 0 ? stats.botMessageCount / stats.messageCount : 0;

                const channelActivity: ChannelActivity = {
                    channelId: stats.channelId,
                    channelName: stats.channelName,
                    guildId: stats.guildId,
                    messageCount: messagesPerMinute,
                    userCount: activeUsers,
                    botMessageCount: stats.botMessageCount,
                    humanMessageCount: stats.humanMessageCount,
                    timestamp: now
                };

                // Track metrics
                metrics.trackChannelActivity(channelActivity);

                // Log structured activity data
                structuredLogger.logChannelActivity({
                    event: 'channel_activity',
                    channel_id: stats.channelId,
                    channel_name: stats.channelName,
                    guild_id: stats.guildId,
                    message_count: messagesPerMinute,
                    user_count: activeUsers,
                    bot_message_count: stats.botMessageCount,
                    human_message_count: stats.humanMessageCount,
                    active_users: stats.recentUsers,
                    timestamp: new Date(now).toISOString()
                });

                // Reset counters for next interval
                stats.messageCount = 0;
                stats.botMessageCount = 0;
                stats.humanMessageCount = 0;
                stats.userSet.clear();
            }
        } catch (error) {
            logger.error('Failed to update channel metrics:', ensureError(error));
        }
    }

    private cleanupOldChannels(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        
        for (const [channelId, stats] of this.channelStats.entries()) {
            if (stats.lastActivity < cutoff) {
                this.channelStats.delete(channelId);
                logger.debug(`Cleaned up inactive channel: ${stats.channelName} (${channelId})`);
            }
        }
    }

    getChannelStats(): Record<string, Omit<ChannelStats, 'userSet'>> {
        const result: Record<string, Omit<ChannelStats, 'userSet'>> = {};
        
        for (const [channelId, stats] of this.channelStats.entries()) {
            result[channelId] = {
                channelId: stats.channelId,
                channelName: stats.channelName,
                guildId: stats.guildId,
                messageCount: stats.messageCount,
                botMessageCount: stats.botMessageCount,
                humanMessageCount: stats.humanMessageCount,
                lastActivity: stats.lastActivity,
                recentUsers: [...stats.recentUsers]
            };
        }
        
        return result;
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
let globalChannelTracker: ChannelActivityTracker | undefined;

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