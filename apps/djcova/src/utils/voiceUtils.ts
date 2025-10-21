// DJCova-specific voice utilities
// Local structural types to avoid relying on external library type names
import { joinVoiceChannel } from '@discordjs/voice';

type VoiceConnectionLike = ReturnType<typeof joinVoiceChannel>;
type PlayerSubscriptionLike = ReturnType<VoiceConnectionLike['subscribe']>;
type AudioPlayerLike = Parameters<VoiceConnectionLike['subscribe']>[0];

type GuildMemberLike = { voice: { channel: VoiceChannelLike | null } };

type VoiceChannelLike = {
	id: string;
	name: string;
	guild: { id: string; voiceAdapterCreator: unknown };
	permissionsFor(member: GuildMemberLike): { has(perms: string[] | string): boolean } | null;
};

type InteractionLike = { member?: unknown; guild?: { id: string } | null; channelId: string };

import { getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';

import { logger } from '@starbunk/shared';

/**
 * Join a voice channel and return the connection
 */
export function createVoiceConnection(channel: VoiceChannelLike, adapterCreator: unknown): VoiceConnectionLike {
	logger.debug(`Joining voice channel: ${channel.name} (${channel.id})`);

	// Check for existing connection first
	const existingConnection = getVoiceConnection(channel.guild.id);
	if (existingConnection) {
		const currentChannelId = existingConnection.joinConfig?.channelId;
		if (currentChannelId === channel.id) {
			logger.debug(`Reusing existing voice connection for guild ${channel.guild.id}`);
			return existingConnection;
		}
		logger.debug(
			`Existing connection is in ${currentChannelId}; switching to ${channel.id} for guild ${channel.guild.id}`,
		);
		try { existingConnection.destroy(); } catch { /* no-op */ }
	}
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: adapterCreator,
	});

	// Set up connection event handlers with improved error handling
	connection.on(VoiceConnectionStatus.Ready, () => {
		logger.info(`✅ Voice connection ready in channel: ${channel.name}`);
	});

	connection.on(VoiceConnectionStatus.Disconnected, async () => {
		logger.warn(`⚠️ Voice connection disconnected from channel: ${channel.name}`);
		// The library will automatically attempt to reconnect
		// If it can't reconnect within 5 seconds, it will transition to Destroyed
	});

	connection.on(VoiceConnectionStatus.Destroyed, () => {
		logger.info(`🔴 Voice connection destroyed for channel: ${channel.name}`);
	});

	connection.on(VoiceConnectionStatus.Connecting, () => {
		logger.debug(`🔄 Voice connection connecting to channel: ${channel.name}`);
	});

	connection.on(VoiceConnectionStatus.Signalling, () => {
		logger.debug(`📡 Voice connection signalling for channel: ${channel.name}`);
	});

	connection.on('error', (error: Error) => {
		logger.error(`❌ Voice connection error in channel ${channel.name}:`, error);
	});

	connection.on('stateChange', (oldState: { status: string }, newState: { status: string }) => {
		logger.debug(
			`Voice connection state changed: ${oldState.status} -> ${newState.status} for channel: ${channel.name}`,
		);
	});

	return connection;
}

/**
 * Get existing voice connection for a guild
 */
export function getGuildVoiceConnection(guildId: string): VoiceConnectionLike | undefined {
	return getVoiceConnection(guildId);
}

/**
 * Disconnect from voice channel
 */
export function disconnectVoiceConnection(guildId: string): void {
	const connection = getVoiceConnection(guildId);
	if (connection) {
		logger.debug(`Disconnecting from voice channel in guild: ${guildId}`);
		try {
			connection.destroy();
			logger.debug(`Voice connection destroyed for guild: ${guildId}`);
		} catch (error) {
			logger.error('Error destroying voice connection:', error instanceof Error ? error : new Error(String(error)));
		}
	}
}

/**
 * Subscribe an audio player to a voice connection
 */
export function subscribePlayerToConnection(
	connection: VoiceConnectionLike,
	player: AudioPlayerLike,
): PlayerSubscriptionLike | undefined {
	try {
		const subscription = connection.subscribe(player);
		if (subscription) {
			logger.debug('Audio player subscribed to voice connection');
		} else {
			logger.warn('Failed to subscribe audio player to voice connection');
		}
		return subscription;
	} catch (error) {
		logger.error(
			'Error subscribing player to connection:',
			error instanceof Error ? error : new Error(String(error)),
		);
		return undefined;
	}
}

/**
 * Validate that user is in a voice channel for voice commands
 */
export function validateVoiceChannelAccess(interaction: InteractionLike): {
	isValid: boolean;
	member?: GuildMemberLike;
	voiceChannel?: VoiceChannelLike;
	errorMessage?: string;
} {
	if (!interaction.guild) {
		return {
			isValid: false,
			errorMessage: 'This command can only be used in a server.',
		};
	}

	const member = interaction.member as GuildMemberLike;
	if (!member) {
		return {
			isValid: false,
			errorMessage: 'Could not find your server membership.',
		};
	}

	const voiceChannel = member.voice.channel;
	if (!voiceChannel) {
		return {
			isValid: false,
			errorMessage: 'You need to be in a voice channel to use this command.',
		};
	}

	return {
		isValid: true,
		member,
		voiceChannel,
	};
}

/**
 * Check if bot has permission to join a voice channel
 */
export function canJoinVoiceChannel(channel: VoiceChannelLike, botMember: GuildMemberLike): boolean {
	const permissions = channel.permissionsFor(botMember);
	return !!permissions?.has(['Connect', 'Speak']);
}
