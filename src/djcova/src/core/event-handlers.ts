import { Client, Events } from 'discord.js';
import { logger } from '@starbunk/shared';
import { ChatInputInteraction } from '../index';
import { CommandHandler } from '../command-handler';
import { ensureError } from '../utils';

/**
 * Setup all Discord event handlers for the client
 */
export function setupDiscordEventHandlers(
	client: Client,
	commandHandler: CommandHandler,
	onReady: () => void
): void {
	// Error and warning handlers
	client.on(Events.Error, (error: Error) => {
		logger.error('Discord client error:', error);
	});

	client.on(Events.Warn, (warning: string) => {
		logger.warn('Discord client warning:', { warning });
	});

	// Connection state handlers
	client.on(Events.ShardDisconnect, () => {
		logger.warn('Discord WebSocket disconnected');
	});

	client.on(Events.ShardReconnecting, () => {
		logger.info('Discord WebSocket reconnecting...');
	});

	client.on(Events.ShardResume, () => {
		logger.info('Discord WebSocket resumed');
	});

	// Command interaction handler
	client.on(Events.InteractionCreate, async (interaction: unknown) => {
		if (!isChatInputCommand(interaction)) return;

		try {
			await commandHandler.handleInteraction(interaction);
		} catch (error) {
			logger.error('Error processing interaction:', ensureError(error));
		}
	});

	// Ready handler
	client.once(Events.ClientReady, () => {
		logger.info('🎵 DJCova is ready and connected to Discord');
		onReady();
	});
}

/**
 * Type guard for chat input commands
 */
function isChatInputCommand(i: unknown): i is ChatInputInteraction {
	return (
		typeof (i as { isChatInputCommand?: unknown })?.isChatInputCommand === 'function' &&
		(i as { isChatInputCommand: () => boolean }).isChatInputCommand()
	);
}

