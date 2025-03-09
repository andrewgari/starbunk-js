import { VoiceChannel, VoiceState } from 'discord.js';
import { logger } from '../services/logger';
import { DebugUtils } from './debug';

/**
 * Utilities for debugging voice channel interactions
 */
export class VoiceDebug {
	/**
   * Log detailed voice state changes
   */
	static logVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
		if (!DebugUtils.isDebugMode()) return;

		const member = newState.member || oldState.member;
		if (!member) {
			logger.warn('Voice state change without member information');
			return;
		}

		const changes: Record<string, { old: string | null; new: string | null }> = {};

		// Check channel changes
		if (oldState.channelId !== newState.channelId) {
			changes.channel = {
				old: oldState.channel?.name || oldState.channelId || null,
				new: newState.channel?.name || newState.channelId || null
			};
		}

		// Check mute status changes
		if (oldState.mute !== newState.mute) {
			changes.mute = {
				old: String(oldState.mute),
				new: String(newState.mute)
			};
		}

		// Check deaf status changes
		if (oldState.deaf !== newState.deaf) {
			changes.deaf = {
				old: String(oldState.deaf),
				new: String(newState.deaf)
			};
		}

		// Check self mute status changes
		if (oldState.selfMute !== newState.selfMute) {
			changes.selfMute = {
				old: String(oldState.selfMute),
				new: String(newState.selfMute)
			};
		}

		// Check self deaf status changes
		if (oldState.selfDeaf !== newState.selfDeaf) {
			changes.selfDeaf = {
				old: String(oldState.selfDeaf),
				new: String(newState.selfDeaf)
			};
		}

		// Check streaming status changes
		if (oldState.streaming !== newState.streaming) {
			changes.streaming = {
				old: String(oldState.streaming),
				new: String(newState.streaming)
			};
		}

		// Log the changes if any
		if (Object.keys(changes).length > 0) {
			logger.debug(`👤 Voice state change for ${member.displayName} (${member.id}):`);
			// eslint-disable-next-line no-console
			console.table(changes);
		}
	}

	/**
   * Log voice connection details
   */
	static logVoiceConnection(channel: VoiceChannel, reason: string): void {
		if (!DebugUtils.isDebugMode()) return;

		const memberCount = channel.members.size;
		const members = channel.members.map(m => m.displayName).join(', ');

		logger.debug(`🔊 Voice connection to ${channel.name} (${channel.id})`);
		logger.debug(`📝 Reason: ${reason}`);
		logger.debug(`👥 Members (${memberCount}): ${members}`);
	}

	/**
   * Log audio processing details
   */
	static logAudioProcessing(url: string, details: Record<string, unknown>): void {
		if (!DebugUtils.isDebugMode()) return;

		logger.debug(`🎵 Processing audio from: ${url}`);
		DebugUtils.logObject('Audio processing details', details);
	}

	/**
   * Create a visual representation of voice channels for debugging
   */
	static getVoiceChannelVisual(channel: VoiceChannel): string {
		if (!DebugUtils.isDebugMode()) return '';

		let visual = `🔊 **${channel.name}** (${channel.members.size} members)\n`;

		// Add members
		channel.members.forEach(member => {
			const statusIcons = [
				member.voice.mute ? '🔇' : '🔊',
				member.voice.deaf ? '🔕' : '🔔',
				member.voice.streaming ? '📹' : '',
				member.voice.selfVideo ? '📱' : ''
			].filter(Boolean).join(' ');

			visual += `> ${statusIcons} ${member.displayName}\n`;
		});

		return visual;
	}
}
