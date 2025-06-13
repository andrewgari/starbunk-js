import { VoiceState } from 'discord.js';
import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { logger } from '../../../../services/logger';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { and, joiningChannel } from '../../core/voice-conditions';
import { GUY_CHANNEL_PATTERNS, GUY_RESPONSE, GUY_TRIGGER_CHANCE } from './constants';

// Helper function that wraps findRandomVoiceChannel to match the expected condition signature
const hasAlternateChannel = async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
	// Import findRandomVoiceChannel inside the function to avoid circular reference
	const { findRandomVoiceChannel } = require('../../core/voice-conditions');
	return !!findRandomVoiceChannel(newState, GUY_CHANNEL_PATTERNS.GuyChannel);
};

export const guyChannelTrigger = {
	name: 'guy-channel-trigger',
	condition: and(
		joiningChannel(GUY_CHANNEL_PATTERNS.GuyChannel),
		hasAlternateChannel
	),
	response: async (oldState: VoiceState, newState: VoiceState): Promise<void> => {
		const member = newState.member;
		if (!member) {
			logger.warn('[GuyChannelBot] No member found in voice state');
			return;
		}

		logger.info(`[GuyChannelBot] User ${member.displayName} attempting to join Guy's lounge`);

		// Import inside the function to avoid circular reference
		const { findRandomVoiceChannel } = require('../../core/voice-conditions');
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

// Get Guy's identity from Discord
async function getGuyIdentity() {
	const discordService = getDiscordService();
	return discordService.getMemberAsBotIdentity(userId.Guy);
}

// Random chance trigger - 1% chance to say "Heh..."
export const guyTrigger = createTriggerResponse({
	name: 'guy-trigger',
	priority: 1,
	condition: withChance(GUY_TRIGGER_CHANCE),
	response: () => GUY_RESPONSE,
	identity: getGuyIdentity
});
