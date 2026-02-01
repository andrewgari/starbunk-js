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
import { logger } from '../observability/logger';
import { getMusicConfig } from '../config/music-config';
import {
  ConnectionHealthMonitor,
  ConnectionHealthMonitorConfig,
  createConnectionHealthMonitor,
} from '../services/connection-health-monitor';

/**
 * Join a voice channel and return the connection
 */
export function createVoiceConnection(
  channel: VoiceChannelLike,
  adapterCreator: unknown,
): VoiceConnectionLike {
  logger.info(`Attempting to join voice channel: ${channel.name} (${channel.id})`);
  logger.debug(`Guild: ${channel.guild.id}`);

  // Check for existing connection first
  const existingConnection = getVoiceConnection(channel.guild.id);
  if (existingConnection) {
    const currentChannelId = existingConnection.joinConfig?.channelId;
    if (currentChannelId === channel.id) {
      logger.info(`✅ Reusing existing voice connection for guild ${channel.guild.id}`);
      return existingConnection;
    }
    logger.debug(
      `Existing connection is in ${currentChannelId}; switching to ${channel.id} for guild ${channel.guild.id}`,
    );
    try {
      logger.debug('Destroying existing connection...');
      existingConnection.destroy();
      logger.debug('✅ Existing connection destroyed');
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .warn('Error destroying existing connection');
    }
  }

  logger.debug('Creating new voice connection...');
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: adapterCreator,
  });
  logger.info(`✅ Voice connection created for channel: ${channel.name}`);

  // Set up connection event handlers with improved error handling
  logger.debug('Setting up voice connection event handlers...');

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
    logger
      .withError(error)
      .withMetadata({
        channel_name: channel.name,
        channel_id: channel.id,
        guild_id: channel.guild.id,
      })
      .error('❌ Voice connection error in channel');
  });

  connection.on('stateChange', (oldState: { status: string }, newState: { status: string }) => {
    logger.debug(
      `Voice connection state changed: ${oldState.status} -> ${newState.status} for channel: ${channel.name}`,
    );
  });

  logger.debug('Voice connection event handlers registered');

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
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .error('Error destroying voice connection');
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
  logger.debug('Subscribing audio player to voice connection...');

  try {
    const subscription = connection.subscribe(player);
    if (subscription) {
      logger.info('✅ Audio player subscribed to voice connection');
    } else {
      logger.warn('⚠️ Failed to subscribe audio player to voice connection - returned undefined');
    }
    return subscription;
  } catch (error) {
    logger
      .withError(error instanceof Error ? error : new Error(String(error)))
      .error('❌ Error subscribing player to connection');
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
export function canJoinVoiceChannel(
  channel: VoiceChannelLike,
  botMember: GuildMemberLike,
): boolean {
  const permissions = channel.permissionsFor(botMember);
  return !!permissions?.has(['Connect', 'Speak']);
}

/**
 * Export health monitor types and functions
 */
export { ConnectionHealthMonitor, createConnectionHealthMonitor };
export type { ConnectionHealthMonitorConfig };

/**
 * Attach health monitor to a voice connection
 * Automatically cleans up when connection is destroyed
 */
export function attachHealthMonitor(
  connection: VoiceConnectionLike,
  guildId: string,
  notificationCallback?: (message: string) => Promise<void>,
): ConnectionHealthMonitor {
  const config = getMusicConfig();

  const monitor = createConnectionHealthMonitor({
    connection,
    guildId,
    intervalMs: config.connectionHealthIntervalMs,
    failureThreshold: config.connectionHealthFailureThreshold,
    onThresholdExceeded: notificationCallback,
  });

  // Start health check
  monitor.start();

  // Add cleanup listener for when connection is permanently destroyed
  // Note: Do not clean up on Disconnected - the library auto-recovers and the monitor should track failures
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    monitor.destroy();
  });

  return monitor;
}
