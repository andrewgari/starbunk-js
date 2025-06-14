import { ChannelType, VoiceChannel, VoiceState } from 'discord.js';
import { logger } from '@starbunk/shared';

/**
 * Creates a condition that checks if a user joined a voice channel
 */
export function userJoined() {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		return !oldState.channelId && !!newState.channelId;
	};
}

/**
 * Creates a condition that checks if a user left a voice channel
 */
export function userLeft() {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		return !!oldState.channelId && !newState.channelId;
	};
}

/**
 * Creates a condition that checks if a user switched voice channels
 */
export function userSwitched() {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		return !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;
	};
}

/**
 * Creates a condition that checks if a channel name matches a pattern
 */
export function channelNameMatches(pattern: RegExp) {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		const channel = newState.channel;
		if (!channel) return false;
		return pattern.test(channel.name);
	};
}

/**
 * Creates a condition that checks if a user is trying to join a specific channel
 */
export function joiningChannel(channelNamePattern: RegExp) {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		if (!newState.channelId) return false;
		const channel = newState.channel;
		if (!channel) return false;
		return channelNamePattern.test(channel.name);
	};
}

/**
 * Combines multiple conditions with AND logic
 */
export function and(...conditions: ((oldState: VoiceState, newState: VoiceState) => Promise<boolean>)[]) {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		for (const condition of conditions) {
			if (!await condition(oldState, newState)) {
				return false;
			}
		}
		return true;
	};
}

/**
 * Combines multiple conditions with OR logic
 */
export function or(...conditions: ((oldState: VoiceState, newState: VoiceState) => Promise<boolean>)[]) {
	return async (oldState: VoiceState, newState: VoiceState): Promise<boolean> => {
		for (const condition of conditions) {
			if (await condition(oldState, newState)) {
				return true;
			}
		}
		return false;
	};
}

/**
 * Helper to find a random voice channel that doesn't match a pattern
 */
export function findRandomVoiceChannel(state: VoiceState, excludePattern: RegExp): VoiceChannel | null {
	const guild = state.guild;
	const voiceChannels = guild.channels.cache.filter(
		channel =>
			channel.type === ChannelType.GuildVoice &&
			!excludePattern.test(channel.name)
	).map(channel => channel as VoiceChannel);

	const channelArray = Array.from(voiceChannels);
	if (channelArray.length === 0) {
		logger.warn('No alternative voice channels found');
		return null;
	}

	const randomIndex = Math.floor(Math.random() * channelArray.length);
	return channelArray[randomIndex];
}
