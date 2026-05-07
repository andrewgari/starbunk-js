/**
 * CovaBot Prometheus metrics
 *
 * Registers CovaBot-specific counters on the shared MetricsService registry
 * so they are served via the /metrics endpoint alongside process metrics.
 */

import * as promClient from 'prom-client';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

function makeCounter(name: string, help: string, labelNames: string[]): promClient.Counter<string> {
  const registry = getMetricsService().getRegistry();
  return new promClient.Counter({ name, help, labelNames, registers: [registry] });
}

/**
 * Tracks every message decision CovaBot makes.
 *
 * Labels:
 *   decision   — "responded" | "skipped"
 *   reason     — ResponseReason value (e.g. "rate_limited", "llm_ignored", "direct_mention")
 *   channel_id — Discord channel snowflake
 *   profile_id — CovaBot personality profile ID
 */
export const messageDecisionsTotal = makeCounter(
  'covabot_message_decisions_total',
  'Total message decisions made by CovaBot, by outcome and reason',
  ['decision', 'reason', 'channel_id', 'profile_id'],
);
