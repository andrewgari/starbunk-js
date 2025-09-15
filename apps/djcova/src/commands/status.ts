import { SlashCommandBuilder } from 'discord.js';
import { logger, sendErrorResponse, sendSuccessResponse, container, ServiceId } from '@starbunk/shared';

// Minimal interaction shape for this command
type InteractionLike = {
	replied?: boolean;
	deferred?: boolean;
	reply: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	followUp: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
};
import { DJCova } from '../djCova';

const commandBuilder = new SlashCommandBuilder()
	.setName('status')
	.setDescription('Check the current status of the music bot');

export default {
	data: commandBuilder.toJSON(),
	async execute(interaction: InteractionLike) {
		try {
			// Get music player from container
			const musicPlayer = container.get<DJCova>(ServiceId.MusicPlayer);

			// Get current volume
			const volume = musicPlayer.getVolume();

			// Get idle status
			const idleStatus = musicPlayer.getIdleStatus();

			let statusMessage = `🎵 **Music Bot Status**\n`;
			statusMessage += `🔊 Volume: ${volume}%\n`;

			if (idleStatus) {
				if (idleStatus.isActive) {
					statusMessage += `⏱️ Idle timer: Active (${idleStatus.timeoutSeconds}s timeout)\n`;
					statusMessage += `🔇 Will auto-disconnect if idle for ${idleStatus.timeoutSeconds} seconds`;
				} else {
					statusMessage += `⏱️ Idle timer: Inactive\n`;
					statusMessage += `🔇 Auto-disconnect timeout: ${idleStatus.timeoutSeconds} seconds`;
				}
			} else {
				statusMessage += `⏱️ Idle management: Not initialized`;
			}

			await sendSuccessResponse(interaction, statusMessage);
			logger.info('Status command executed successfully');
		} catch (error) {
			logger.error('Error executing status command:', error instanceof Error ? error : new Error(String(error)));
			await sendErrorResponse(interaction, 'An error occurred while checking the bot status.');
		}
	},
};
