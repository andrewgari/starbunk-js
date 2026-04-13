import * as promClient from 'prom-client';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

/**
 * DJCova-specific Prometheus metrics.
 *
 * Tracks the three-step play funnel so Grafana can immediately show where
 * the pipeline breaks down:
 *
 *   /play invoked → voice channel joined → audio actually streaming
 *
 * All counters share the MetricsService registry so they are exposed through
 * the same /metrics endpoint as the generic bot metrics.
 */
export class DJCovaMetrics {
  private playCommandTotal: promClient.Counter<string>;
  private voiceJoinTotal: promClient.Counter<string>;
  private audioPlaybackStartedTotal: promClient.Counter<string>;

  constructor(registry: promClient.Registry) {
    this.playCommandTotal = new promClient.Counter({
      name: 'djcova_play_command_total',
      help: 'Total /play command invocations by outcome',
      labelNames: ['guild_id', 'status'],
      registers: [registry],
    });

    this.voiceJoinTotal = new promClient.Counter({
      name: 'djcova_voice_join_total',
      help: 'Total voice channel join attempts by outcome',
      labelNames: ['guild_id', 'status'],
      registers: [registry],
    });

    this.audioPlaybackStartedTotal = new promClient.Counter({
      name: 'djcova_audio_playback_started_total',
      help: 'Total times audio playback successfully reached the streaming stage',
      labelNames: ['guild_id'],
      registers: [registry],
    });
  }

  /** Record a /play command invocation. */
  trackPlayCommand(guildId: string, status: 'success' | 'error'): void {
    this.playCommandTotal.inc({ guild_id: guildId, status });
  }

  /** Record a voice channel join attempt. */
  trackVoiceJoin(guildId: string, status: 'joined' | 'failed'): void {
    this.voiceJoinTotal.inc({ guild_id: guildId, status });
  }

  /** Record that audio actually began streaming (yt-dlp → ffmpeg → Discord). */
  trackAudioPlaybackStarted(guildId: string): void {
    this.audioPlaybackStartedTotal.inc({ guild_id: guildId });
  }
}

let instance: DJCovaMetrics | undefined;

/**
 * Returns the singleton DJCovaMetrics instance.
 * Must be called after getMetricsService() has been initialized with the
 * correct service name (done in src/djcova/src/index.ts).
 */
export function getDJCovaMetrics(): DJCovaMetrics {
  if (!instance) {
    const registry = getMetricsService().getRegistry();
    instance = new DJCovaMetrics(registry);
  }
  return instance;
}
