import { ChannelType, Collection, VoiceChannel, VoiceState } from 'discord.js';
import { logger } from '../../../services/logger';
import { VoiceBot } from '../voiceBot';

export default class GuyChannelBot extends VoiceBot {
	botName = 'GuyChannelBot';

	async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const member = newState.member || oldState.member;
		if (!member) {
			logger.warn('Received voice state update without member information');
			return;
		}

		const oldChannelId = oldState.channelId;
		const newChannelId = newState.channelId;

		// If user is not moving between channels, ignore
		if (oldChannelId === newChannelId) return;

		// Check if user is joining Guy's lounge
		if (newChannelId && newState.channel?.name.toLowerCase().includes('guy')) {
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
				logger.warn(`🚫 ${member.displayName} tried to join Guy's lounge, redirecting to ${lounge.name}`);
				await member.voice.setChannel(lounge);
			}
		}

		logger.debug(`👤 ${member.displayName} moved from ${oldChannelId || 'nowhere'} to ${newChannelId || 'nowhere'}`);
	}

	connectToChannel(): void {
		// Implementation will be added later
	}
}
