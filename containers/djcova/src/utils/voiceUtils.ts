// DJCova-specific voice utilities
import {
	GuildMember,
	CommandInteraction,
	VoiceBasedChannel
} from 'discord.js';
import { 
	joinVoiceChannel, 
	VoiceConnection, 
	getVoiceConnection,
	VoiceConnectionStatus,
	AudioPlayer,
	PlayerSubscription
} from '@discordjs/voice';
import { logger } from '@starbunk/shared';

/**
 * Join a voice channel and return the connection
 */
export function createVoiceConnection(
	channel: VoiceBasedChannel,
	adapterCreator: (methods: unknown) => unknown
): VoiceConnection {
	logger.debug(`Joining voice channel: ${channel.name} (${channel.id})`);
	
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: adapterCreator,
	});

	// Set up connection event handlers
	connection.on(VoiceConnectionStatus.Ready, () => {
		logger.info(`Voice connection ready in channel: ${channel.name}`);
	});

	connection.on(VoiceConnectionStatus.Disconnected, () => {
		logger.info(`Voice connection disconnected from channel: ${channel.name}`);
	});

	connection.on('error', (error: Error) => {
		logger.error(`Voice connection error in channel ${channel.name}:`, error);
	});

	return connection;
}

/**
 * Get existing voice connection for a guild
 */
export function getGuildVoiceConnection(guildId: string): VoiceConnection | undefined {
	return getVoiceConnection(guildId);
}

/**
 * Disconnect from voice channel
 */
export function disconnectVoiceConnection(guildId: string): void {
	const connection = getVoiceConnection(guildId);
	if (connection) {
		logger.debug(`Disconnecting from voice channel in guild: ${guildId}`);
		connection.disconnect();
	}
}

/**
 * Subscribe an audio player to a voice connection
 */
export function subscribePlayerToConnection(
	connection: VoiceConnection,
	player: AudioPlayer
): PlayerSubscription | undefined {
	try {
		const subscription = connection.subscribe(player);
		if (subscription) {
			logger.debug('Audio player subscribed to voice connection');
		} else {
			logger.warn('Failed to subscribe audio player to voice connection');
		}
		return subscription;
	} catch (error) {
		logger.error('Error subscribing player to connection:', error instanceof Error ? error : new Error(String(error)));
		return undefined;
	}
}

/**
 * Validate that user is in a voice channel for voice commands
 */
export function validateVoiceChannelAccess(interaction: CommandInteraction): {
	isValid: boolean;
	member?: GuildMember;
	voiceChannel?: VoiceBasedChannel;
	errorMessage?: string;
} {
	if (!interaction.guild) {
		return {
			isValid: false,
			errorMessage: 'This command can only be used in a server.'
		};
	}

	const member = interaction.member as GuildMember;
	if (!member) {
		return {
			isValid: false,
			errorMessage: 'Could not find your server membership.'
		};
	}

	const voiceChannel = member.voice.channel;
	if (!voiceChannel) {
		return {
			isValid: false,
			errorMessage: 'You need to be in a voice channel to use this command.'
		};
	}

	return {
		isValid: true,
		member,
		voiceChannel
	};
}

/**
 * Check if bot has permission to join a voice channel
 */
export function canJoinVoiceChannel(channel: VoiceBasedChannel, botMember: GuildMember): boolean {
	const permissions = channel.permissionsFor(botMember);
	return !!(permissions?.has(['Connect', 'Speak']));
}
