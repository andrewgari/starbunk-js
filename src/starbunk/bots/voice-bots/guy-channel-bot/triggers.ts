import { VoiceState } from 'discord.js';
import { logger } from '../../../../services/logger';
import { and, findRandomVoiceChannel, joiningChannel } from '../../core/voice-conditions';
import { GUY_CHANNEL_PATTERNS } from './constants';

export const guyChannelTrigger = {
	name: 'guy-channel-trigger',
	condition: and(
		joiningChannel(GUY_CHANNEL_PATTERNS.GuyChannel)
	),
	response: async (oldState: VoiceState, newState: VoiceState): Promise<void> => {
		const member = newState.member;
		if (!member) {
			logger.warn('[GuyChannelBot] No member found in voice state');
			return;
		}

		logger.info(`[GuyChannelBot] User ${member.displayName} attempting to join Guy's lounge`);

		const alternateChannel = findRandomVoiceChannel(newState, GUY_CHANNEL_PATTERNS.GuyChannel);
		if (!alternateChannel) {
			logger.warn(`[GuyChannelBot] No alternative voice channels found for redirecting ${member.displayName}`);
			return;
		}

		try {
			await member.voice.setChannel(alternateChannel);
			logger.info(`[GuyChannelBot] Successfully redirected ${member.displayName} to ${alternateChannel.name}`);
		} catch (moveError) {
			logger.error(`[GuyChannelBot] Failed to move ${member.displayName} to ${alternateChannel.name}:`, moveError as Error);
		}
	},
	priority: 1
};
