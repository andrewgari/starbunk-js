import { registerHealthCheckModule } from '../observability/health-server';

/** Sliding window duration for activity metrics */
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Warn if no message processed in this long (only after MIN_UPTIME_MS) */
const SILENCE_WARN_MS = 30 * 60 * 1000; // 30 minutes

/** Minimum uptime before silence checks fire — avoids false alarms on startup */
const MIN_UPTIME_MS = 10 * 60 * 1000; // 10 minutes

type EventType = 'message' | 'trigger' | 'response_ok' | 'response_fail' | 'error';

interface ActivityEvent {
  type: EventType;
  ts: number;
  label?: string;
}

/**
 * Tracks per-bot activity (messages received, triggers fired, responses sent, errors)
 * and registers itself as a HealthCheckModule so the data surfaces on /health.
 *
 * Key signals surfaced:
 * - Silence: no messages processed for > 30 minutes (bot may be frozen)
 * - Trigger-response gap: trigger(s) fired but no responses succeeded
 * - Elevated error rate: errors > 10% of messages processed
 */
export class BotActivityTracker {
  public readonly name: string;
  private events: ActivityEvent[] = [];
  private lastMessageAt: number | null = null;
  private readonly startedAt: number;

  constructor(name: string) {
    this.name = name;
    this.startedAt = Date.now();

    registerHealthCheckModule({
      name,
      getHealth: () => this.getHealth(),
    });
  }

  private record(type: EventType, label?: string): void {
    const now = Date.now();
    this.events.push({ type, ts: now, label });
    // Keep at most 2× window worth of events to bound memory
    const cutoff = now - WINDOW_MS * 2;
    if (this.events.length > 500 || (this.events[0]?.ts ?? now) < cutoff) {
      this.events = this.events.filter(e => e.ts >= cutoff);
    }
  }

  /** Call each time a Discord message arrives for processing */
  onMessageReceived(): void {
    this.lastMessageAt = Date.now();
    this.record('message');
  }

  /** Call when a trigger condition is met — i.e. the bot has decided to respond */
  onTriggerFired(triggerName?: string): void {
    this.record('trigger', triggerName);
  }

  /** Call after a response send attempt — success or failure */
  onResponseSent(success: boolean, label?: string): void {
    this.record(success ? 'response_ok' : 'response_fail', label);
  }

  /** Call on any message-processing error */
  onError(type: string): void {
    this.record('error', type);
  }

  async getHealth(): Promise<Record<string, unknown>> {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const w = this.events.filter(e => e.ts >= windowStart);

    const messages = w.filter(e => e.type === 'message').length;
    const triggers = w.filter(e => e.type === 'trigger').length;
    const responsesOk = w.filter(e => e.type === 'response_ok').length;
    const responsesFail = w.filter(e => e.type === 'response_fail').length;
    const errors = w.filter(e => e.type === 'error').length;

    const silenceMs = this.lastMessageAt !== null ? now - this.lastMessageAt : null;
    const uptimeMs = now - this.startedAt;

    const warnings: string[] = [];
    let status: 'ok' | 'degraded' | 'critical' = 'ok';

    // Trigger fired but no response got out — all failed
    if (triggers > 0 && responsesOk === 0 && responsesFail > 0) {
      status = 'critical';
      warnings.push(
        `Trigger-response mismatch: ${triggers} trigger(s) fired, 0 responses succeeded (${responsesFail} failed)`,
      );
    } else if (triggers > 0 && responsesOk < Math.ceil(triggers * 0.5)) {
      // Less than half the triggers produced a successful response
      if (status === 'ok') status = 'degraded';
      warnings.push(
        `Low response rate: ${triggers} trigger(s) fired but only ${responsesOk} response(s) succeeded`,
      );
    }

    // Elevated error rate
    if (messages > 0) {
      const errorRate = errors / messages;
      if (errorRate > 0.1) {
        if (status === 'ok') status = 'degraded';
        warnings.push(
          `High error rate: ${errors} error(s) in ${messages} messages (${(errorRate * 100).toFixed(1)}%)`,
        );
      }
    }

    // Silence detection — skip until the bot has been up for a while
    if (uptimeMs > MIN_UPTIME_MS && silenceMs !== null && silenceMs > SILENCE_WARN_MS) {
      if (status === 'ok') status = 'degraded';
      warnings.push(`No messages processed for ${Math.floor(silenceMs / 60_000)} minutes`);
    }

    return {
      status,
      warnings,
      last_message_at:
        this.lastMessageAt !== null ? new Date(this.lastMessageAt).toISOString() : null,
      silence_ms: silenceMs,
      uptime_ms: uptimeMs,
      window_seconds: WINDOW_MS / 1000,
      window: {
        messages,
        triggers_fired: triggers,
        responses_ok: responsesOk,
        responses_failed: responsesFail,
        errors,
      },
    };
  }
}

const trackers = new Map<string, BotActivityTracker>();

/**
 * Get (or create) the BotActivityTracker for a given module name.
 * The tracker self-registers with the health server on first access.
 */
export function getBotActivityTracker(name: string): BotActivityTracker {
  if (!trackers.has(name)) {
    trackers.set(name, new BotActivityTracker(name));
  }
  return trackers.get(name)!;
}
