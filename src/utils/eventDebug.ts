import { Client } from 'discord.js';
import loggerAdapter from '../services/loggerAdapter';
import { DebugUtils } from './debug';

/**
 * Utilities for debugging Discord events
 */
export class EventDebug {
	private static eventHandlers = new Map<string, Set<string>>();
	private static eventCounts = new Map<string, number>();
	private static originalEmit: ((event: string, ...args: unknown[]) => boolean) | null = null;

	/**
   * Register an event handler for tracking
   */
	static registerHandler(event: string, handlerId: string): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, new Set());
		}

		this.eventHandlers.get(event)?.add(handlerId);
	}

	/**
   * Unregister an event handler
   */
	static unregisterHandler(event: string, handlerId: string): void {
		this.eventHandlers.get(event)?.delete(handlerId);
	}

	/**
   * Start monitoring Discord.js events
   */
	static monitorEvents(client: Client): void {
		if (!DebugUtils.isDebugMode() || this.originalEmit) return;

		// Store the original emit function
		this.originalEmit = client.emit;

		// Override the emit function to log events
		client.emit = (event: string, ...args: unknown[]): boolean => {
			// Increment event count
			const currentCount = this.eventCounts.get(event) || 0;
			this.eventCounts.set(event, currentCount + 1);

			// Get registered handlers for this event
			const handlers = this.eventHandlers.get(event);

			// Log the event if it's not a frequent one
			if (!this.isFrequentEvent(event)) {
				loggerAdapter.debug(`🔔 Discord Event: ${event} (${currentCount + 1})`);

				if (handlers && handlers.size > 0) {
					loggerAdapter.debug(`👉 Handlers: ${Array.from(handlers).join(', ')}`);
				}

				// Log additional details for specific events
				this.logEventDetails(event, args);
			}

			// Call the original emit function
			if (this.originalEmit) {
				return this.originalEmit.apply(client, [event, ...args]);
			}

			return false;
		};

		loggerAdapter.debug('🔍 Discord.js event monitoring started');
	}

	/**
   * Stop monitoring Discord.js events
   */
	static stopMonitoring(client: Client): void {
		if (!this.originalEmit) return;

		// Restore the original emit function
		client.emit = this.originalEmit;
		this.originalEmit = null;

		loggerAdapter.debug('🔍 Discord.js event monitoring stopped');
	}

	/**
   * Get event statistics
   */
	static getEventStats(): Record<string, number> {
		const stats: Record<string, number> = {};

		this.eventCounts.forEach((count, event) => {
			stats[event] = count;
		});

		return stats;
	}

	/**
   * Reset event statistics
   */
	static resetStats(): void {
		this.eventCounts.clear();
	}

	/**
   * Check if an event is a frequent one that would spam the logs
   */
	private static isFrequentEvent(event: string): boolean {
		const frequentEvents = [
			'debug',
			'raw',
			'presenceUpdate',
			'typingStart'
		];

		return frequentEvents.includes(event);
	}

	/**
   * Log additional details for specific events
   */
	private static logEventDetails(event: string, args: unknown[]): void {
		switch (event) {
			case 'messageCreate':
				if (args[0] && typeof args[0] === 'object' && 'author' in args[0] && 'content' in args[0]) {
					const message = args[0] as { author?: { tag?: string }; content: string };
					loggerAdapter.debug(`📝 Message from ${message.author?.tag || 'Unknown'}: ${message.content.substring(0, 50)}`);
				}
				break;

			case 'interactionCreate':
				if (args[0] && typeof args[0] === 'object' && 'type' in args[0] && 'user' in args[0]) {
					const interaction = args[0] as { type: string; user?: { tag?: string } };
					loggerAdapter.debug(`🤖 Interaction: ${interaction.type} from ${interaction.user?.tag || 'Unknown'}`);
				}
				break;

			case 'guildMemberAdd':
			case 'guildMemberRemove':
				if (args[0] && typeof args[0] === 'object' && 'user' in args[0]) {
					const member = args[0] as { user?: { tag?: string } };
					loggerAdapter.debug(`👤 Member ${event === 'guildMemberAdd' ? 'joined' : 'left'}: ${member.user?.tag || 'Unknown'}`);
				}
				break;

			case 'error':
				if (args[0] instanceof Error) {
					loggerAdapter.error('Discord client error', args[0]);
				}
				break;
		}
	}

	/**
   * Create a debug event bus for custom application events
   */
	static createEventBus(): {
		emit: (event: string, data: unknown) => void;
		on: (event: string, handler: (data: unknown) => void) => void;
		off: (event: string, handler: (data: unknown) => void) => void;
	} {
		const handlers = new Map<string, Set<(data: unknown) => void>>();

		return {
			emit: (event: string, data: unknown): void => {
				if (DebugUtils.isDebugMode()) {
					loggerAdapter.debug(`📢 App Event: ${event}`);
					DebugUtils.logObject(`Event data for ${event}`, data);
				}

				const eventHandlers = handlers.get(event);
				if (eventHandlers) {
					eventHandlers.forEach(handler => {
						try {
							handler(data);
						} catch (error) {
							loggerAdapter.error(`Error in event handler for ${event}`, error as Error);
						}
					});
				}
			},

			on: (event: string, handler: (data: unknown) => void): void => {
				if (!handlers.has(event)) {
					handlers.set(event, new Set());
				}

				handlers.get(event)?.add(handler);

				if (DebugUtils.isDebugMode()) {
					loggerAdapter.debug(`➕ Handler added for app event: ${event}`);
				}
			},

			off: (event: string, handler: (data: unknown) => void): void => {
				handlers.get(event)?.delete(handler);

				if (DebugUtils.isDebugMode()) {
					loggerAdapter.debug(`➖ Handler removed for app event: ${event}`);
				}
			}
		};
	}
}
