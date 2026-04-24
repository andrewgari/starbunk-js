import { registerHealthCheckModule } from '@starbunk/shared/observability/health-server';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('DJCovaHealth');

export interface GuildVoiceState {
  guildId: string;
  connectionStatus: string;
  playerStatus: string;
  /** True if a /play command was issued and playback has not yet started */
  pendingPlayback: boolean;
  pendingPlaybackSince: number | null;
}

/** Timeout after which pending playback is flagged as unhealthy (ms) */
const PENDING_PLAYBACK_TIMEOUT_MS = 30_000;

/** AudioPlayerStatus.Playing value (string literal to avoid import-time side effects) */
const PLAYER_STATUS_PLAYING = 'playing';

/** VoiceConnectionStatus values that indicate the connection is not usable */
const UNHEALTHY_CONNECTION_STATUSES = new Set(['disconnected', 'destroyed']);

const guildStates = new Map<string, GuildVoiceState>();

/**
 * Update the voice connection status for a guild.
 * Call this whenever the VoiceConnection state changes.
 */
export function updateVoiceConnectionStatus(guildId: string, status: string): void {
  const state = getOrCreateGuildState(guildId);
  state.connectionStatus = status;
}

/**
 * Update the audio player status for a guild.
 * Clears pendingPlayback when player enters Playing state.
 */
export function updateAudioPlayerStatus(guildId: string, status: string): void {
  const state = getOrCreateGuildState(guildId);
  state.playerStatus = status;
  if (status === PLAYER_STATUS_PLAYING) {
    state.pendingPlayback = false;
    state.pendingPlaybackSince = null;
  }
}

/**
 * Mark that a /play command was issued for a guild.
 * The health module will flag this as degraded if playback does not start
 * within PENDING_PLAYBACK_TIMEOUT_MS.
 */
export function markPlayCommandIssued(guildId: string): void {
  const state = getOrCreateGuildState(guildId);
  state.pendingPlayback = true;
  state.pendingPlaybackSince = Date.now();
}

/**
 * Remove state for a guild (e.g. when the bot disconnects or leaves).
 */
export function clearGuildState(guildId: string): void {
  guildStates.delete(guildId);
}

function getOrCreateGuildState(guildId: string): GuildVoiceState {
  if (!guildStates.has(guildId)) {
    guildStates.set(guildId, {
      guildId,
      connectionStatus: 'disconnected',
      playerStatus: 'idle',
      pendingPlayback: false,
      pendingPlaybackSince: null,
    });
  }
  return guildStates.get(guildId)!;
}

/**
 * Register the DJCova voice/audio health check module.
 * Reports per-guild voice connection and player status under /health.
 */
export function registerDJCovaHealthModule(): void {
  registerHealthCheckModule({
    name: 'voice',
    getHealth: async () => {
      const now = Date.now();
      const warnings: string[] = [];
      let status: 'ok' | 'degraded' | 'critical' = 'ok';

      const guilds = Array.from(guildStates.values()).map(state => {
        const guildWarnings: string[] = [];

        if (UNHEALTHY_CONNECTION_STATUSES.has(state.connectionStatus)) {
          guildWarnings.push(`Voice connection is ${state.connectionStatus}`);
          if (status === 'ok') status = 'degraded';
        }

        if (state.pendingPlayback && state.pendingPlaybackSince !== null) {
          const waitMs = now - state.pendingPlaybackSince;
          if (waitMs > PENDING_PLAYBACK_TIMEOUT_MS) {
            guildWarnings.push(
              `Play command issued ${Math.floor(waitMs / 1000)}s ago but playback has not started`,
            );
            status = 'degraded';
          }
        }

        return {
          guild_id: state.guildId,
          connection_status: state.connectionStatus,
          player_status: state.playerStatus,
          pending_playback: state.pendingPlayback,
          warnings: guildWarnings.length > 0 ? guildWarnings : undefined,
        };
      });

      warnings.push(...guilds.flatMap(g => g.warnings ?? []));

      return {
        status,
        active_guilds: guilds.length,
        guilds,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  });

  logger.info('DJCova voice health module registered');
}
