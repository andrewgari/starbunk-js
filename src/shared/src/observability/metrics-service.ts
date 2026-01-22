import * as promClient from 'prom-client';

/**
 * Metrics service for Discord bots
 * Tracks bot triggers, responses, and system metrics
 */
export class MetricsService {
	private registry: promClient.Registry;
	private enabled: boolean;
	private serviceName: string;

	// Bot-specific metrics
	private messagesProcessed: promClient.Counter<string>;
	private botTriggersTotal: promClient.Counter<string>;
	private botTriggerEvaluationsTotal: promClient.Counter<string>;
	private botResponsesTotal: promClient.Counter<string>;
	private botResponseDuration: promClient.Histogram<string>;
	private triggerEvaluationDuration: promClient.Histogram<string>;
	private botErrorsTotal: promClient.Counter<string>;
	private activeBotsGauge: promClient.Gauge<string>;
	private uniqueUsersGauge: promClient.Gauge<string>;

	// Server health metrics
	private discordGatewayLatency: promClient.Gauge<string>;
	private discordConnectionStatus: promClient.Gauge<string>;
	private discordReconnections: promClient.Counter<string>;
	private discordApiErrors: promClient.Counter<string>;
	private discordRateLimits: promClient.Counter<string>;

	// Message throughput metrics
	private messagesByType: promClient.Counter<string>;
	private messageSizeBytes: promClient.Histogram<string>;
	private messagesPerSecond: promClient.Gauge<string>;
	private dmMessagesTotal: promClient.Counter<string>;

	// Channel activity metrics
	private activeChannelsGauge: promClient.Gauge<string>;
	private channelMessageRate: promClient.Counter<string>;
	private voiceChannelUsers: promClient.Gauge<string>;

	// Member activity metrics
	private activeMembersGauge: promClient.Gauge<string>;
	private memberJoins: promClient.Counter<string>;
	private memberLeaves: promClient.Counter<string>;
	private userMessageFrequency: promClient.Counter<string>;

	// Bot performance metrics
	private botUptimeSeconds: promClient.Gauge<string>;
	private commandExecutions: promClient.Counter<string>;
	private cacheHits: promClient.Counter<string>;
	private cacheMisses: promClient.Counter<string>;

	constructor(serviceName: string) {
		this.enabled = process.env.ENABLE_METRICS !== 'false'; // Enabled by default
		this.registry = new promClient.Registry();
		this.serviceName = serviceName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

		// Add default metrics (CPU, memory, etc.)
		if (this.enabled) {
			promClient.collectDefaultMetrics({ register: this.registry });
		}

		// Initialize custom metrics
		this.messagesProcessed = new promClient.Counter({
			name: `${this.serviceName}_messages_processed_total`,
			help: 'Total number of Discord messages processed',
			labelNames: ['guild_id', 'channel_id'],
			registers: [this.registry],
		});

		this.botTriggersTotal = new promClient.Counter({
			name: `${this.serviceName}_bot_triggers_total`,
			help: 'Total number of bot triggers that fired successfully',
			labelNames: ['bot_name', 'trigger_name', 'guild_id', 'channel_id', 'condition_type', 'author_type'],
			registers: [this.registry],
		});

		this.botTriggerEvaluationsTotal = new promClient.Counter({
			name: `${this.serviceName}_bot_trigger_evaluations_total`,
			help: 'Total number of trigger evaluations (both matched and not matched)',
			labelNames: ['bot_name', 'trigger_name', 'guild_id', 'channel_id', 'result', 'author_type'],
			registers: [this.registry],
		});

		this.botResponsesTotal = new promClient.Counter({
			name: `${this.serviceName}_bot_responses_total`,
			help: 'Total number of bot responses sent',
			labelNames: ['bot_name', 'guild_id', 'channel_id', 'status'],
			registers: [this.registry],
		});

		this.botResponseDuration = new promClient.Histogram({
			name: `${this.serviceName}_bot_response_duration_ms`,
			help: 'Bot response latency in milliseconds',
			labelNames: ['bot_name', 'guild_id'],
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
			registers: [this.registry],
		});

		this.triggerEvaluationDuration = new promClient.Histogram({
			name: `${this.serviceName}_trigger_evaluation_duration_ms`,
			help: 'Trigger condition evaluation duration in milliseconds',
			labelNames: ['bot_name', 'trigger_name', 'guild_id', 'result'],
			buckets: [1, 5, 10, 25, 50, 100, 250, 500],
			registers: [this.registry],
		});

		this.botErrorsTotal = new promClient.Counter({
			name: `${this.serviceName}_bot_errors_total`,
			help: 'Total number of bot errors',
			labelNames: ['bot_name', 'error_type', 'guild_id'],
			registers: [this.registry],
		});

		this.activeBotsGauge = new promClient.Gauge({
			name: `${this.serviceName}_active_bots`,
			help: 'Number of active bots loaded',
			registers: [this.registry],
		});

		this.uniqueUsersGauge = new promClient.Gauge({
			name: `${this.serviceName}_unique_users_interacting`,
			help: 'Number of unique users who have triggered bots',
			labelNames: ['bot_name', 'guild_id'],
			registers: [this.registry],
		});

		// Server health metrics
		this.discordGatewayLatency = new promClient.Gauge({
			name: `${this.serviceName}_discord_gateway_latency_ms`,
			help: 'Discord WebSocket gateway latency in milliseconds',
			registers: [this.registry],
		});

		this.discordConnectionStatus = new promClient.Gauge({
			name: `${this.serviceName}_discord_connection_status`,
			help: 'Discord connection status (1 = connected, 0 = disconnected)',
			registers: [this.registry],
		});

		this.discordReconnections = new promClient.Counter({
			name: `${this.serviceName}_discord_reconnections_total`,
			help: 'Total number of Discord reconnection events',
			labelNames: ['reason'],
			registers: [this.registry],
		});

		this.discordApiErrors = new promClient.Counter({
			name: `${this.serviceName}_discord_api_errors_total`,
			help: 'Total number of Discord API errors',
			labelNames: ['error_code', 'endpoint'],
			registers: [this.registry],
		});

		this.discordRateLimits = new promClient.Counter({
			name: `${this.serviceName}_discord_rate_limits_total`,
			help: 'Total number of Discord API rate limit hits',
			labelNames: ['endpoint', 'method'],
			registers: [this.registry],
		});

		// Message throughput metrics
		this.messagesByType = new promClient.Counter({
			name: `${this.serviceName}_messages_by_type_total`,
			help: 'Total messages by type',
			labelNames: ['guild_id', 'channel_id', 'message_type', 'has_embeds', 'has_attachments'],
			registers: [this.registry],
		});

		this.messageSizeBytes = new promClient.Histogram({
			name: `${this.serviceName}_message_size_bytes`,
			help: 'Message content size distribution in bytes',
			labelNames: ['guild_id', 'channel_id'],
			buckets: [100, 500, 1000, 2000, 4000, 8000, 16000],
			registers: [this.registry],
		});

		this.messagesPerSecond = new promClient.Gauge({
			name: `${this.serviceName}_messages_per_second`,
			help: 'Current message processing rate per second',
			labelNames: ['guild_id'],
			registers: [this.registry],
		});

		this.dmMessagesTotal = new promClient.Counter({
			name: `${this.serviceName}_dm_messages_total`,
			help: 'Total direct messages processed',
			labelNames: ['direction'],
			registers: [this.registry],
		});

		// Channel activity metrics
		this.activeChannelsGauge = new promClient.Gauge({
			name: `${this.serviceName}_active_channels`,
			help: 'Number of channels with recent activity',
			labelNames: ['guild_id', 'channel_type'],
			registers: [this.registry],
		});

		this.channelMessageRate = new promClient.Counter({
			name: `${this.serviceName}_channel_messages_total`,
			help: 'Total messages per channel',
			labelNames: ['guild_id', 'channel_id', 'channel_name'],
			registers: [this.registry],
		});

		this.voiceChannelUsers = new promClient.Gauge({
			name: `${this.serviceName}_voice_channel_users`,
			help: 'Number of users in voice channels',
			labelNames: ['guild_id', 'channel_id', 'channel_name'],
			registers: [this.registry],
		});

		// Member activity metrics
		this.activeMembersGauge = new promClient.Gauge({
			name: `${this.serviceName}_active_members`,
			help: 'Number of members with recent activity',
			labelNames: ['guild_id', 'time_window'],
			registers: [this.registry],
		});

		this.memberJoins = new promClient.Counter({
			name: `${this.serviceName}_member_joins_total`,
			help: 'Total member join events',
			labelNames: ['guild_id'],
			registers: [this.registry],
		});

		this.memberLeaves = new promClient.Counter({
			name: `${this.serviceName}_member_leaves_total`,
			help: 'Total member leave events',
			labelNames: ['guild_id', 'reason'],
			registers: [this.registry],
		});

		this.userMessageFrequency = new promClient.Counter({
			name: `${this.serviceName}_user_message_frequency_total`,
			help: 'Message count per user',
			labelNames: ['guild_id', 'user_id', 'username'],
			registers: [this.registry],
		});

		// Bot performance metrics
		this.botUptimeSeconds = new promClient.Gauge({
			name: `${this.serviceName}_uptime_seconds`,
			help: 'Bot uptime in seconds',
			registers: [this.registry],
		});

		this.commandExecutions = new promClient.Counter({
			name: `${this.serviceName}_command_executions_total`,
			help: 'Total command executions',
			labelNames: ['command_name', 'guild_id', 'status'],
			registers: [this.registry],
		});

		this.cacheHits = new promClient.Counter({
			name: `${this.serviceName}_cache_hits_total`,
			help: 'Total cache hits',
			labelNames: ['cache_type'],
			registers: [this.registry],
		});

		this.cacheMisses = new promClient.Counter({
			name: `${this.serviceName}_cache_misses_total`,
			help: 'Total cache misses',
			labelNames: ['cache_type'],
			registers: [this.registry],
		});
	}

	trackMessageProcessed(guildId: string, channelId: string): void {
		if (!this.enabled) return;
		this.messagesProcessed.inc({ guild_id: guildId, channel_id: channelId });
	}

	trackBotTrigger(
		botName: string,
		triggerName: string,
		guildId: string,
		channelId: string,
		conditionType?: string,
		authorType?: 'bot' | 'human'
	): void {
		if (!this.enabled) return;
		this.botTriggersTotal.inc({
			bot_name: botName,
			trigger_name: triggerName,
			guild_id: guildId,
			channel_id: channelId,
			condition_type: conditionType || 'unknown',
			author_type: authorType || 'unknown',
		});
	}

	trackTriggerEvaluation(
		botName: string,
		triggerName: string,
		guildId: string,
		channelId: string,
		result: 'matched' | 'not_matched' | 'error',
		authorType: 'bot' | 'human'
	): void {
		if (!this.enabled) return;
		this.botTriggerEvaluationsTotal.inc({
			bot_name: botName,
			trigger_name: triggerName,
			guild_id: guildId,
			channel_id: channelId,
			result,
			author_type: authorType,
		});
	}

	trackTriggerEvaluationDuration(
		botName: string,
		triggerName: string,
		guildId: string,
		result: 'matched' | 'not_matched' | 'error',
		durationMs: number
	): void {
		if (!this.enabled) return;
		this.triggerEvaluationDuration.observe(
			{
				bot_name: botName,
				trigger_name: triggerName,
				guild_id: guildId,
				result,
			},
			durationMs
		);
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

	// Server health tracking methods
	setGatewayLatency(latencyMs: number): void {
		if (!this.enabled) return;
		this.discordGatewayLatency.set(latencyMs);
	}

	setConnectionStatus(connected: boolean): void {
		if (!this.enabled) return;
		this.discordConnectionStatus.set(connected ? 1 : 0);
	}

	trackReconnection(reason: string): void {
		if (!this.enabled) return;
		this.discordReconnections.inc({ reason });
	}

	trackApiError(errorCode: string, endpoint: string): void {
		if (!this.enabled) return;
		this.discordApiErrors.inc({ error_code: errorCode, endpoint });
	}

	trackRateLimit(endpoint: string, method: string): void {
		if (!this.enabled) return;
		this.discordRateLimits.inc({ endpoint, method });
	}

	// Message throughput tracking methods
	trackMessageByType(
		guildId: string,
		channelId: string,
		messageType: 'text' | 'reply' | 'thread',
		hasEmbeds: boolean,
		hasAttachments: boolean
	): void {
		if (!this.enabled) return;
		this.messagesByType.inc({
			guild_id: guildId,
			channel_id: channelId,
			message_type: messageType,
			has_embeds: hasEmbeds.toString(),
			has_attachments: hasAttachments.toString(),
		});
	}

	trackMessageSize(guildId: string, channelId: string, sizeBytes: number): void {
		if (!this.enabled) return;
		this.messageSizeBytes.observe({ guild_id: guildId, channel_id: channelId }, sizeBytes);
	}

	setMessagesPerSecond(guildId: string, rate: number): void {
		if (!this.enabled) return;
		this.messagesPerSecond.set({ guild_id: guildId }, rate);
	}

	trackDmMessage(direction: 'incoming' | 'outgoing'): void {
		if (!this.enabled) return;
		this.dmMessagesTotal.inc({ direction });
	}

	// Channel activity tracking methods
	setActiveChannels(guildId: string, channelType: string, count: number): void {
		if (!this.enabled) return;
		this.activeChannelsGauge.set({ guild_id: guildId, channel_type: channelType }, count);
	}

	trackChannelMessage(guildId: string, channelId: string, channelName: string): void {
		if (!this.enabled) return;
		this.channelMessageRate.inc({ guild_id: guildId, channel_id: channelId, channel_name: channelName });
	}

	setVoiceChannelUsers(guildId: string, channelId: string, channelName: string, userCount: number): void {
		if (!this.enabled) return;
		this.voiceChannelUsers.set({ guild_id: guildId, channel_id: channelId, channel_name: channelName }, userCount);
	}

	// Member activity tracking methods
	setActiveMembers(guildId: string, timeWindow: string, count: number): void {
		if (!this.enabled) return;
		this.activeMembersGauge.set({ guild_id: guildId, time_window: timeWindow }, count);
	}

	trackMemberJoin(guildId: string): void {
		if (!this.enabled) return;
		this.memberJoins.inc({ guild_id: guildId });
	}

	trackMemberLeave(guildId: string, reason: 'kick' | 'ban' | 'leave'): void {
		if (!this.enabled) return;
		this.memberLeaves.inc({ guild_id: guildId, reason });
	}

	trackUserMessage(guildId: string, userId: string, username: string): void {
		if (!this.enabled) return;
		this.userMessageFrequency.inc({ guild_id: guildId, user_id: userId, username });
	}

	// Bot performance tracking methods
	setUptime(uptimeSeconds: number): void {
		if (!this.enabled) return;
		this.botUptimeSeconds.set(uptimeSeconds);
	}

	trackCommandExecution(commandName: string, guildId: string, status: 'success' | 'error'): void {
		if (!this.enabled) return;
		this.commandExecutions.inc({ command_name: commandName, guild_id: guildId, status });
	}

	trackCacheHit(cacheType: string): void {
		if (!this.enabled) return;
		this.cacheHits.inc({ cache_type: cacheType });
	}

	trackCacheMiss(cacheType: string): void {
		if (!this.enabled) return;
		this.cacheMisses.inc({ cache_type: cacheType });
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

/**
 * Get or create the singleton MetricsService instance
 * @param serviceName - The name of the service (e.g., 'bunkbot', 'djcova', 'bluebot')
 * @returns The MetricsService singleton instance
 */
export function getMetricsService(serviceName: string = 'app'): MetricsService {
	if (!metricsInstance) {
		metricsInstance = new MetricsService(serviceName);
	}
	return metricsInstance;
}

/**
 * Factory function to create a new MetricsService instance.
 * Use this in tests to create isolated metrics instances.
 * @param serviceName - The name of the service (e.g., 'bunkbot', 'djcova', 'bluebot')
 */
export function createMetricsService(serviceName: string = 'app'): MetricsService {
	return new MetricsService(serviceName);
}

