import { Client, Events } from 'discord.js';
import { ChatInputInteraction } from '../index';
import { CommandHandler } from '../command-handler';
import { ensureError } from '../utils';
import { logger } from '../observability/logger';

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
		logger.withError(error).error('Discord client error');
	});

	client.on(Events.Warn, (warning: string) => {
		logger.withMetadata({ warning }).warn('Discord client warning');
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
			logger.withError(ensureError(error)).error('Error processing interaction');
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

