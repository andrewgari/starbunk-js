import { BaseMessageOptions, Message } from 'discord.js';
import { DebugUtils } from './debug';

/**
 * Utilities for visualizing bot responses and behavior in debug mode
 */
export class DebugVisualization {
	/**
   * Add debug information to a message content
   */
	static enhanceMessageContent(content: string, debugInfo: Record<string, unknown>): string {
		if (!DebugUtils.isDebugMode()) return content;

		// Format the debug info as a code block
		const debugBlock = Object.entries(debugInfo)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
			.join('\n');

		return `${content}\n\n**[DEBUG INFO]**\n\`\`\`json\n${debugBlock}\n\`\`\``;
	}

	/**
   * Add debug information to message options
   */
	static enhanceMessageOptions(options: BaseMessageOptions, debugInfo: Record<string, unknown>): BaseMessageOptions {
		if (!DebugUtils.isDebugMode()) return options;

		const newOptions = { ...options };

		// If content exists, enhance it
		if (typeof newOptions.content === 'string') {
			newOptions.content = this.enhanceMessageContent(newOptions.content, debugInfo);
		} else {
			// Create content with debug info if it doesn't exist
			const debugBlock = Object.entries(debugInfo)
				.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
				.join('\n');

			newOptions.content = `**[DEBUG INFO]**\n\`\`\`json\n${debugBlock}\n\`\`\``;
		}

		return newOptions;
	}

	/**
   * Add visual debug prefix to bot name
   */
	static debugBotName(name: string): string {
		return DebugUtils.isDebugMode() ? `[DEBUG] ${name}` : name;
	}

	/**
   * Add visual debug prefix to bot avatar URL
   */
	static debugBotAvatar(avatarUrl: string): string {
		// In debug mode, we could use a special debug avatar
		// but for now we'll just return the original
		return avatarUrl;
	}

	/**
   * Add debug information to a message after it's been sent
   */
	static async addDebugReaction(message: Message, triggerInfo: Record<string, unknown>): Promise<void> {
		if (!DebugUtils.isDebugMode()) return;

		try {
			// Add a debug reaction to indicate this message was processed in debug mode
			await message.react('🐛');

			// Log the trigger information
			DebugUtils.logObject(`Message ${message.id} trigger info`, triggerInfo);
		} catch (error) {
			// Silently fail if we can't add reactions
		}
	}
}
