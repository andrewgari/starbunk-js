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

import { getVoiceConnection, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { logger } from '../observability/logger';
import { getMusicConfig } from '../config/music-config';
import {
  ConnectionHealthMonitor,
  ConnectionHealthMonitorConfig,
  createConnectionHealthMonitor,
} from '../services/connection-health-monitor';
import { trace } from '@opentelemetry/api';

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
export async function subscribePlayerToConnection(
  connection: VoiceConnectionLike,
  player: AudioPlayerLike,
): Promise<PlayerSubscriptionLike | undefined> {
  logger.debug('Subscribing audio player to voice connection...');

  try {
    await waitForConnectionReady(connection);
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
 * Asynchronously waits for a voice connection to reach the 'Ready' state.
 * This is a critical readiness gate to prevent "player attached to not-ready connection" failures.
 *
 * Implements a connection readiness gate that:
 * - Waits up to 5 seconds for the connection to reach Ready state
 * - Handles race conditions (connection destroyed during wait)
 * - Provides structured logging with trace IDs
 * - Exports OpenTelemetry traces for observability
 *
 * @param connection The voice connection to monitor.
 * @param timeoutMs The maximum time to wait in milliseconds (default: 5000ms).
 * @throws ConnectionNotReadyError if the connection does not become ready within the timeout
 * @throws ConnectionDestroyedError if the connection is destroyed while waiting
 */
export async function waitForConnectionReady(
  connection: VoiceConnectionLike,
  timeoutMs = 5000,
): Promise<void> {
  const tracer = trace.getTracer('djcova');
  const startTime = Date.now();
  const connectionId = `conn_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

  // Start OpenTelemetry span
  const span = tracer.startSpan('djcova.connection.wait_for_ready', {
    attributes: {
      'connection.id': connectionId,
      'connection.timeout_ms': timeoutMs,
      'connection.initial_status': connection.state.status,
    },
  });

  // Early return if already ready
  if (connection.state.status === VoiceConnectionStatus.Ready) {
    const elapsed = Date.now() - startTime;
    logger
      .withMetadata({
        connection_id: connectionId,
        wait_duration_ms: elapsed,
        final_state: VoiceConnectionStatus.Ready,
        trace_id: connectionId,
      })
      .debug('Connection already in Ready state');

    span.setAttributes({
      'connection.result': 'already_ready',
      'connection.wait_duration_ms': elapsed,
    });
    span.end();
    return;
  }

  try {
    logger
      .withMetadata({
        connection_id: connectionId,
        timeout_ms: timeoutMs,
        current_status: connection.state.status,
        trace_id: connectionId,
      })
      .debug('Waiting for voice connection to reach Ready state');

    // entersState is a utility from @discordjs/voice that resolves when the connection
    // enters the target state, and rejects if it is destroyed or the timeout is exceeded.
    await entersState(connection, VoiceConnectionStatus.Ready, timeoutMs);

    const elapsed = Date.now() - startTime;
    logger
      .withMetadata({
        connection_id: connectionId,
        wait_duration_ms: elapsed,
        final_state: VoiceConnectionStatus.Ready,
        timeout_ms: timeoutMs,
        trace_id: connectionId,
      })
      .info('✅ Voice connection reached Ready state');

    span.setAttributes({
      'connection.result': 'success',
      'connection.wait_duration_ms': elapsed,
    });
    span.end();
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const typedError = error instanceof Error ? error : new Error(String(error));
    let errorType = 'unknown';
    let errorMessage = '';

    // Provide a clearer error message for different failure scenarios
    if (typedError.message.includes('timed out')) {
      errorType = 'timeout';
      errorMessage = `Connection did not reach Ready state within ${timeoutMs}ms`;
      logger
        .withMetadata({
          connection_id: connectionId,
          wait_duration_ms: elapsed,
          timeout_ms: timeoutMs,
          final_state: connection.state.status,
          error_type: errorType,
          trace_id: connectionId,
        })
        .warn(`⏱️ ${errorMessage}`);
    } else if (typedError.message.includes('destroyed')) {
      errorType = 'destroyed';
      errorMessage = 'Connection was destroyed before reaching Ready state';
      logger
        .withMetadata({
          connection_id: connectionId,
          wait_duration_ms: elapsed,
          timeout_ms: timeoutMs,
          final_state: connection.state.status,
          error_type: errorType,
          trace_id: connectionId,
        })
        .warn(`🔴 ${errorMessage}`);
    } else {
      errorType = 'error';
      errorMessage = `Voice connection failed: ${typedError.message}`;
      logger
        .withError(typedError)
        .withMetadata({
          connection_id: connectionId,
          wait_duration_ms: elapsed,
          timeout_ms: timeoutMs,
          final_state: connection.state.status,
          error_type: errorType,
          trace_id: connectionId,
        })
        .error('❌ Voice connection error while waiting for Ready state');
    }

    span.setAttributes({
      'connection.result': errorType,
      'connection.error': errorMessage,
      'connection.wait_duration_ms': elapsed,
    });
    span.end();

    throw new Error(errorMessage);
  }
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
