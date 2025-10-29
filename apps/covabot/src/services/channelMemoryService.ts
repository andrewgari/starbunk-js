import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';

/**
 * Channel Memory Service
 * Maintains a simple in-memory cache of recent messages per channel
 * Used to provide conversation context to the LLM
 */

interface ChannelMessage {
	author: string;
	content: string;
	timestamp: number;
}

interface ChannelMemory {
	messages: ChannelMessage[];
	lastUpdated: number;
}

// Store channel memories - keyed by channel ID
const channelMemories = new Map<string, ChannelMemory>();

// Configuration
const MAX_MESSAGES_PER_CHANNEL = 10;
const MESSAGE_RETENTION_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Add a message to channel memory
 * @param message - Discord message to store
 */
export function addMessageToMemory(message: Message): void {
	try {
		const channelId = message.channelId;
		const author = message.author.username;
		const content = message.content;

		// Get or create channel memory
		let memory = channelMemories.get(channelId);
		if (!memory) {
			memory = {
				messages: [],
				lastUpdated: Date.now(),
			};
			channelMemories.set(channelId, memory);
		}

		// Add new message
		memory.messages.push({
			author,
			content,
			timestamp: Date.now(),
		});

		// Keep only recent messages
		if (memory.messages.length > MAX_MESSAGES_PER_CHANNEL) {
			memory.messages = memory.messages.slice(-MAX_MESSAGES_PER_CHANNEL);
		}

		memory.lastUpdated = Date.now();

		logger.debug(
			`[ChannelMemory] Added message from ${author} to channel ${channelId} (total: ${memory.messages.length})`,
		);
	} catch (error) {
		logger.error('[ChannelMemory] Error adding message to memory:', error as Error);
	}
}

/**
 * Get recent messages from channel memory as context string
 * @param message - Discord message to get context for
 * @param maxMessages - Maximum number of messages to return (default: 5)
 * @returns Formatted context string or empty string if no history
 */
export function getChannelContext(message: Message, maxMessages: number = 5): string {
	try {
		const channelId = message.channelId;
		const memory = channelMemories.get(channelId);

		if (!memory || memory.messages.length === 0) {
			logger.debug(`[ChannelMemory] No context available for channel ${channelId}`);
			return '';
		}

		// Get the most recent messages
		const recentMessages = memory.messages.slice(-maxMessages);

		// Format as context string
		const contextLines = recentMessages.map((msg) => `${msg.author}: ${msg.content}`);

		const context = `Recent conversation:\n${contextLines.join('\n')}`;

		logger.debug(
			`[ChannelMemory] Returning ${recentMessages.length} messages as context for channel ${channelId}`,
		);

		return context;
	} catch (error) {
		logger.error('[ChannelMemory] Error getting channel context:', error as Error);
		return '';
	}
}

/**
 * Get channel memory statistics
 * @param channelId - Channel ID to get stats for
 * @returns Memory stats or null if channel not found
 */
export function getChannelMemoryStats(channelId: string): {
	messageCount: number;
	oldestMessage: number;
	newestMessage: number;
	ageSeconds: number;
} | null {
	const memory = channelMemories.get(channelId);

	if (!memory || memory.messages.length === 0) {
		return null;
	}

	const now = Date.now();
	const messages = memory.messages;

	return {
		messageCount: messages.length,
		oldestMessage: messages[0].timestamp,
		newestMessage: messages[messages.length - 1].timestamp,
		ageSeconds: Math.round((now - messages[0].timestamp) / 1000),
	};
}

/**
 * Clear old messages from all channels
 * Removes messages older than MESSAGE_RETENTION_TIME
 */
export function cleanupOldMessages(): void {
	try {
		const now = Date.now();
		let totalRemoved = 0;

		for (const [channelId, memory] of channelMemories.entries()) {
			const beforeCount = memory.messages.length;

			// Remove messages older than retention time
			memory.messages = memory.messages.filter((msg) => now - msg.timestamp < MESSAGE_RETENTION_TIME);

			const removed = beforeCount - memory.messages.length;
			if (removed > 0) {
				totalRemoved += removed;
				logger.debug(`[ChannelMemory] Cleaned up ${removed} old messages from channel ${channelId}`);
			}

			// Remove empty channel memories
			if (memory.messages.length === 0) {
				channelMemories.delete(channelId);
			}
		}

		if (totalRemoved > 0) {
			logger.debug(`[ChannelMemory] Total cleanup: removed ${totalRemoved} old messages`);
		}
	} catch (error) {
		logger.error('[ChannelMemory] Error cleaning up old messages:', error as Error);
	}
}

/**
 * Clear all channel memories
 */
export function clearAllChannelMemories(): void {
	const count = channelMemories.size;
	channelMemories.clear();
	logger.debug(`[ChannelMemory] Cleared all channel memories (${count} channels)`);
}

/**
 * Get all channel memory statistics
 */
export function getAllChannelMemoryStats(): Record<
	string,
	{
		messageCount: number;
		ageSeconds: number;
	}
> {
	const stats: Record<string, { messageCount: number; ageSeconds: number }> = {};
	const now = Date.now();

	for (const [channelId, memory] of channelMemories.entries()) {
		if (memory.messages.length > 0) {
			stats[channelId] = {
				messageCount: memory.messages.length,
				ageSeconds: Math.round((now - memory.messages[0].timestamp) / 1000),
			};
		}
	}

	return stats;
}

/**
 * Start periodic cleanup of old messages
 * Runs every 5 minutes
 */
export function startMemoryCleanupInterval(): NodeJS.Timer {
	const interval = setInterval(() => {
		cleanupOldMessages();
	}, 5 * 60 * 1000);

	logger.debug('[ChannelMemory] Started periodic cleanup interval (every 5 minutes)');
	return interval;
}

