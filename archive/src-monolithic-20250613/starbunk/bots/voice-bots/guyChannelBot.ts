import { ChannelType, Collection, VoiceChannel, VoiceState } from 'discord.js';
import { logger } from '../../../services/logger';
import { VoiceBot } from '../voiceBot';

export default class GuyChannelBot extends VoiceBot {
	botName = 'GuyChannelBot';

	async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		logger.debug(`[${this.botName}] Processing voice state update`);

		try {
			const member = newState.member || oldState.member;
			if (!member) {
				logger.warn(`[${this.botName}] Received voice state update without member information`);
				return;
			}

			const oldChannelId = oldState.channelId;
			const newChannelId = newState.channelId;
			const oldChannelName = oldState.channel?.name || 'unknown';
			const newChannelName = newState.channel?.name || 'unknown';

			logger.debug(`[${this.botName}] Voice state change for ${member.displayName}:
				From: ${oldChannelName} (${oldChannelId || 'none'})
				To: ${newChannelName} (${newChannelId || 'none'})`);

			// If user is not moving between channels, ignore
			if (oldChannelId === newChannelId) {
				logger.debug(`[${this.botName}] Ignoring state update - user not changing channels`);
				return;
			}

			// Check if user is joining Guy's lounge
			if (newChannelId && newState.channel?.name.toLowerCase().includes('guy')) {
				logger.info(`[${this.botName}] User ${member.displayName} attempting to join Guy's lounge`);

				const guild = newState.guild;
				const lounges = guild.channels.cache.filter(
					channel =>
						channel.type === ChannelType.GuildVoice &&
						!channel.name.toLowerCase().includes('guy')
				) as Collection<string, VoiceChannel>;

				const loungeArray = Array.from(lounges.values());
				if (loungeArray.length > 0) {
					const randomIndex = Math.floor(Math.random() * loungeArray.length);
					const lounge = loungeArray[randomIndex];

					logger.warn(`[${this.botName}] 🚫 ${member.displayName} tried to join Guy's lounge, redirecting to ${lounge.name}`);

					try {
						await member.voice.setChannel(lounge);
						logger.info(`[${this.botName}] Successfully redirected ${member.displayName} to ${lounge.name}`);
					} catch (moveError) {
						logger.error(`[${this.botName}] Failed to move ${member.displayName} to ${lounge.name}:`, moveError as Error);
					}
				} else {
					logger.warn(`[${this.botName}] No alternative voice channels found for redirecting ${member.displayName}`);
				}
			}

			logger.debug(`[${this.botName}] 👤 Voice state update completed for ${member.displayName}`);
		} catch (error) {
			logger.error(`[${this.botName}] Error processing voice state update:`, error as Error);
		}
	}

	connectToChannel(): void {
		logger.debug(`[${this.botName}] connectToChannel called - implementation pending`);
		// Implementation will be added later
	}
}
