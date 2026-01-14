import * as promClient from 'prom-client';

/**
 * Metrics service for bluebot
 * Tracks bot triggers, responses, and system metrics
 */
export class MetricsService {
	private registry: promClient.Registry;
	private enabled: boolean;

	// Metrics
	private messagesProcessed: promClient.Counter<string>;
	private botTriggersTotal: promClient.Counter<string>;
	private botResponsesTotal: promClient.Counter<string>;
	private botResponseDuration: promClient.Histogram<string>;
	private botErrorsTotal: promClient.Counter<string>;
	private activeBotsGauge: promClient.Gauge<string>;
	private uniqueUsersGauge: promClient.Gauge<string>;

	constructor() {
		this.enabled = process.env.ENABLE_METRICS !== 'false'; // Enabled by default
		this.registry = new promClient.Registry();

		// Add default metrics (CPU, memory, etc.)
		if (this.enabled) {
			promClient.collectDefaultMetrics({ register: this.registry });
		}

		// Initialize custom metrics
		this.messagesProcessed = new promClient.Counter({
			name: 'bluebot_messages_processed_total',
			help: 'Total number of Discord messages processed',
			labelNames: ['guild_id', 'channel_id'],
			registers: [this.registry],
		});

		this.botTriggersTotal = new promClient.Counter({
			name: 'bluebot_bot_triggers_total',
			help: 'Total number of bot triggers',
			labelNames: ['bot_name', 'trigger_name', 'guild_id', 'channel_id'],
			registers: [this.registry],
		});

		this.botResponsesTotal = new promClient.Counter({
			name: 'bluebot_bot_responses_total',
			help: 'Total number of bot responses sent',
			labelNames: ['bot_name', 'guild_id', 'channel_id', 'status'],
			registers: [this.registry],
		});

		this.botResponseDuration = new promClient.Histogram({
			name: 'bluebot_bot_response_duration_ms',
			help: 'Bot response latency in milliseconds',
			labelNames: ['bot_name', 'guild_id'],
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
			registers: [this.registry],
		});

		this.botErrorsTotal = new promClient.Counter({
			name: 'bluebot_bot_errors_total',
			help: 'Total number of bot errors',
			labelNames: ['bot_name', 'error_type', 'guild_id'],
			registers: [this.registry],
		});

		this.activeBotsGauge = new promClient.Gauge({
			name: 'bluebot_active_bots',
			help: 'Number of active bots loaded',
			registers: [this.registry],
		});

		this.uniqueUsersGauge = new promClient.Gauge({
			name: 'bluebot_unique_users_interacting',
			help: 'Number of unique users who have triggered bots',
			labelNames: ['bot_name', 'guild_id'],
			registers: [this.registry],
		});
	}

	trackMessageProcessed(guildId: string, channelId: string): void {
		if (!this.enabled) return;
		this.messagesProcessed.inc({ guild_id: guildId, channel_id: channelId });
	}

	trackBotTrigger(botName: string, triggerName: string, guildId: string, channelId: string): void {
		if (!this.enabled) return;
		this.botTriggersTotal.inc({
			bot_name: botName,
			trigger_name: triggerName,
			guild_id: guildId,
			channel_id: channelId,
		});
	}

	trackBotResponse(botName: string, guildId: string, channelId: string, status: 'success' | 'error'): void {
		if (!this.enabled) return;
		this.botResponsesTotal.inc({
			bot_name: botName,
			guild_id: guildId,
			channel_id: channelId,
			status,
		});
	}

	trackBotResponseDuration(botName: string, guildId: string, durationMs: number): void {
		if (!this.enabled) return;
		this.botResponseDuration.observe({ bot_name: botName, guild_id: guildId }, durationMs);
	}

	trackBotError(botName: string, errorType: string, guildId: string): void {
		if (!this.enabled) return;
		this.botErrorsTotal.inc({ bot_name: botName, error_type: errorType, guild_id: guildId });
	}

	setActiveBots(count: number): void {
		if (!this.enabled) return;
		this.activeBotsGauge.set(count);
	}

	trackUniqueUser(botName: string, guildId: string, _userId: string): void {
		if (!this.enabled) return;
		// Note: This is a simplified implementation. In production, you'd want to track
		// unique users in a Set or similar data structure and update the gauge periodically
		// For now, we'll just increment to show activity
		this.uniqueUsersGauge.inc({ bot_name: botName, guild_id: guildId });
	}

	async getMetrics(): Promise<string> {
		return this.registry.metrics();
	}

	getRegistry(): promClient.Registry {
		return this.registry;
	}
}

// Singleton instance
let metricsInstance: MetricsService | undefined;

export function getMetricsService(): MetricsService {
	if (!metricsInstance) {
		metricsInstance = new MetricsService();
	}
	return metricsInstance;
}

