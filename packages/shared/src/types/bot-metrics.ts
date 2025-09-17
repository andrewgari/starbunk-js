/**
 * TypeScript interfaces for Bot Trigger Metrics Collection
 * Defines data structures for comprehensive bot performance tracking and analytics
 */

// ============================================================================
// Core Bot Trigger Event Interfaces
// ============================================================================

// MessageContext is imported from ContainerMetrics for consistency

/**
 * Individual bot trigger event with full context
 * Represents a single instance of a bot being triggered by a message
 */
export interface BotTriggerEvent {
	/** Unique identifier for this trigger event */
	triggerId: string;
	/** Unix timestamp when the trigger occurred */
	timestamp: number;
	/** Name of the bot that was triggered */
	botName: string;
	/** Specific condition within the bot that matched */
	conditionName: string;
	/** Discord user ID who sent the triggering message */
	userId: string;
	/** Discord channel ID where the trigger occurred */
	channelId: string;
	/** Discord guild (server) ID */
	guildId?: string;
	/** Discord message ID that triggered the bot */
	messageId: string;
	/** Response time in milliseconds (0 if not yet responded) */
	responseTimeMs?: number;
	/** Type of response sent by the bot */
	responseType?: 'message' | 'reaction' | 'webhook' | 'none';
	/** Whether the bot successfully responded */
	success?: boolean;
	/** Error message if the bot failed to respond */
	errorMessage?: string;
	/** Additional context data */
	metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics for a specific time period
 */
export interface BotMetricsAggregation {
	/** Time bucket this aggregation represents */
	timeKey: string;
	/** Aggregation period (hour, day, week, month) */
	period: 'hour' | 'day' | 'week' | 'month';
	/** Bot name this aggregation is for */
	botName: string;
	/** Total number of triggers in this period */
	totalTriggers: number;
	/** Total successful responses in this period */
	totalResponses: number;
	/** Total failed attempts in this period */
	totalFailures: number;
	/** Average response time in milliseconds */
	avgResponseTime: number;
	/** Minimum response time in this period */
	minResponseTime: number;
	/** Maximum response time in this period */
	maxResponseTime: number;
	/** Number of unique users who triggered this bot */
	uniqueUsers: number;
	/** Number of unique channels where this bot was triggered */
	uniqueChannels: number;
	/** Most common trigger condition in this period */
	topCondition?: string;
	/** Response type distribution */
	responseTypes: Record<string, number>;
}

// ============================================================================
// Query and Filter Interfaces
// ============================================================================

/**
 * Filters for querying bot metrics
 */
export interface BotMetricsFilter {
	/** Filter by specific bot name */
	botName?: string;
	/** Filter by bot names (multiple) */
	botNames?: string[];
	/** Filter by specific user ID */
	userId?: string;
	/** Filter by specific channel ID */
	channelId?: string;
	/** Filter by specific guild ID */
	guildId?: string;
	/** Filter by condition name */
	conditionName?: string;
	/** Filter by response type */
	responseType?: string;
	/** Filter by success status */
	success?: boolean;
	/** Start timestamp (Unix) */
	startTime?: number;
	/** End timestamp (Unix) */
	endTime?: number;
	/** Limit number of results */
	limit?: number;
	/** Offset for pagination */
	offset?: number;
}

/**
 * Time range query options
 */
export interface TimeRangeQuery {
	/** Start of the time range (Unix timestamp) */
	startTime: number;
	/** End of the time range (Unix timestamp) */
	endTime: number;
	/** Aggregation period */
	period: 'hour' | 'day' | 'week' | 'month';
	/** Timezone for aggregation (default: UTC) */
	timezone?: string;
}

// ============================================================================
// Analytics and Reporting Interfaces
// ============================================================================

/**
 * Bot performance analytics result
 */
export interface BotPerformanceAnalytics {
	/** Bot name */
	botName: string;
	/** Analysis time range */
	timeRange: {
		start: number;
		end: number;
	};
	/** Overall statistics */
	stats: {
		totalTriggers: number;
		totalResponses: number;
		successRate: number;
		avgResponseTime: number;
		medianResponseTime: number;
		p95ResponseTime: number;
		uniqueUsers: number;
		uniqueChannels: number;
		uniqueGuilds: number;
	};
	/** Trend data over time */
	trends: {
		triggersPerHour: number[];
		avgResponseTimePerHour: number[];
		successRatePerHour: number[];
		timestamps: number[];
	};
	/** Top performing conditions */
	topConditions: Array<{
		conditionName: string;
		triggerCount: number;
		successRate: number;
		avgResponseTime: number;
	}>;
	/** Channel distribution */
	channelDistribution: Array<{
		channelId: string;
		triggerCount: number;
		successRate: number;
	}>;
	/** User engagement metrics */
	userEngagement: Array<{
		userId: string;
		triggerCount: number;
		lastTrigger: number;
	}>;
}

/**
 * Channel activity analytics
 */
export interface ChannelActivityAnalytics {
	/** Channel ID */
	channelId: string;
	/** Guild ID (if applicable) */
	guildId?: string;
	/** Analysis time range */
	timeRange: {
		start: number;
		end: number;
	};
	/** Channel statistics */
	stats: {
		totalMessages: number;
		totalBotTriggers: number;
		uniqueBots: number;
		uniqueUsers: number;
		botTriggerRate: number; // Percentage of messages that trigger bots
		avgResponseTime: number;
	};
	/** Bot activity in this channel */
	botActivity: Array<{
		botName: string;
		triggerCount: number;
		successRate: number;
		avgResponseTime: number;
		lastTrigger: number;
	}>;
	/** Activity timeline */
	timeline: Array<{
		timestamp: number;
		messageCount: number;
		botTriggerCount: number;
	}>;
}

/**
 * User interaction analytics
 */
export interface UserInteractionAnalytics {
	/** User ID */
	userId: string;
	/** Analysis time range */
	timeRange: {
		start: number;
		end: number;
	};
	/** User statistics */
	stats: {
		totalMessages: number;
		totalBotTriggers: number;
		uniqueBots: number;
		uniqueChannels: number;
		botInteractionRate: number;
		favoriteBot?: string;
		mostActiveChannel?: string;
	};
	/** Bot interactions */
	botInteractions: Array<{
		botName: string;
		triggerCount: number;
		lastTrigger: number;
		avgResponseTime: number;
		favoriteCondition: string;
	}>;
	/** Channel activity */
	channelActivity: Array<{
		channelId: string;
		triggerCount: number;
		lastTrigger: number;
	}>;
}

// ============================================================================
// Service Configuration Interfaces
// ============================================================================

/**
 * Redis connection configuration
 */
export interface RedisConfiguration {
	/** Redis host */
	host: string;
	/** Redis port */
	port: number;
	/** Redis password (if required) */
	password?: string;
	/** Redis database number */
	db?: number;
	/** Connection timeout in ms */
	connectTimeout?: number;
	/** Command timeout in ms */
	commandTimeout?: number;
	/** Maximum number of retries */
	retryDelayOnFailover?: number;
	/** Enable keepalive */
	keepAlive?: boolean;
	/** Connection pool settings */
	pool?: {
		min: number;
		max: number;
	};
}

/**
 * Metrics service configuration
 */
export interface BotMetricsServiceConfig {
	/** Redis configuration */
	redis: RedisConfiguration;
	/** Enable batch operations */
	enableBatchOperations?: boolean;
	/** Batch size for bulk operations */
	batchSize?: number;
	/** Batch flush interval in ms */
	batchFlushInterval?: number;
	/** Enable circuit breaker for Redis operations */
	enableCircuitBreaker?: boolean;
	/** Circuit breaker configuration */
	circuitBreaker?: {
		failureThreshold: number;
		resetTimeout: number;
		monitoringPeriod: number;
	};
	/** Data retention settings */
	retention?: {
		/** Keep individual events for X days */
		eventRetentionDays: number;
		/** Keep hourly aggregates for X days */
		_hourlyRetentionDays: number;
		/** Keep daily aggregates for X days */
		_dailyRetentionDays: number;
		/** Keep monthly aggregates for X days */
		_monthlyRetentionDays: number;
	};
	/** Performance monitoring */
	monitoring?: {
		/** Log slow operations (ms threshold) */
		slowOperationThreshold: number;
		/** Sample rate for detailed logging */
		loggingSampleRate: number;
		/** Enable Redis command timing */
		enableCommandTiming: boolean;
	};
}

// ============================================================================
// Circuit Breaker Interfaces
// ============================================================================

/**
 * Circuit breaker state
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
	state: CircuitBreakerState;
	failureCount: number;
	lastFailureTime?: number;
	lastSuccessTime?: number;
	totalRequests: number;
	totalFailures: number;
	totalSuccesses: number;
	resetTime?: number;
}

// ============================================================================
// Prometheus Integration Interfaces
// ============================================================================

/**
 * Prometheus metrics labels for bot triggers
 */
export interface PrometheusLabels {
	bot_name: string;
	condition_name?: string;
	user_id?: string;
	channel_id?: string;
	guild_id?: string;
	response_type?: string;
	success?: string;
}

/**
 * Prometheus metrics export result
 */
export interface PrometheusMetricsExport {
	/** Total bot triggers metric */
	bot_triggers_total: Array<{
		labels: PrometheusLabels;
		value: number;
		timestamp?: number;
	}>;
	/** Response time histogram */
	bot_response_time_seconds: Array<{
		labels: Omit<PrometheusLabels, 'user_id' | 'channel_id' | 'guild_id'>;
		buckets: Record<string, number>;
		count: number;
		sum: number;
	}>;
	/** Success rate gauge */
	bot_success_rate: Array<{
		labels: Omit<PrometheusLabels, 'user_id' | 'channel_id' | 'guild_id'>;
		value: number;
	}>;
}

// ============================================================================
// Error and Health Check Interfaces
// ============================================================================

/**
 * Service health check result
 */
export interface HealthCheckResult {
	/** Service name */
	service: string;
	/** Health status */
	status: 'healthy' | 'degraded' | 'unhealthy';
	/** Timestamp of check */
	timestamp: number;
	/** Detailed checks */
	checks: {
		redis: {
			status: 'connected' | 'disconnected' | 'error';
			latency?: number;
			error?: string;
		};
		circuitBreaker: {
			status: CircuitBreakerState;
			failureCount: number;
		};
		memory: {
			usage: number;
			limit: number;
		};
	};
	/** Performance metrics */
	metrics: {
		operationsPerSecond: number;
		avgResponseTime: number;
		errorRate: number;
	};
}

/**
 * Service operation result
 */
export interface ServiceOperationResult<T = unknown> {
	/** Whether the operation succeeded */
	success: boolean;
	/** Result data (if successful) */
	data?: T;
	/** Error information (if failed) */
	error?: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
	/** Operation metadata */
	metadata?: {
		operationTime: number;
		cacheHit?: boolean;
		circuitBreakerState?: CircuitBreakerState;
	};
}

// ============================================================================
// Batch Operation Interfaces
// ============================================================================

/**
 * Batch operation request
 */
export interface BatchOperationRequest {
	/** Operation type */
	operation: 'track_trigger' | 'update_aggregation' | 'cleanup_old_data';
	/** Batch items */
	items: unknown[];
	/** Batch metadata */
	metadata?: {
		batchId: string;
		timestamp: number;
		priority: 'low' | 'normal' | 'high';
	};
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
	/** Number of successful operations */
	successful: number;
	/** Number of failed operations */
	failed: number;
	/** Total processing time */
	processingTimeMs: number;
	/** Individual errors (if any) */
	errors?: Array<{
		index: number;
		error: string;
	}>;
}

// ============================================================================
// Export Types for External Use
// ============================================================================

/**
 * Main service interface export
 */
export interface IBotTriggerMetricsService {
	// Core tracking methods
	trackBotTrigger(event: BotTriggerEvent): Promise<ServiceOperationResult<void>>;
	trackBatchTriggers(events: BotTriggerEvent[]): Promise<ServiceOperationResult<BatchOperationResult>>;

	// Query methods
	// 	getBotMetrics(filter: BotMetricsFilter, timeRange?: TimeRangeQuery): Promise<ServiceOperationResult<BotPerformanceAnalytics>>;
	// 	getChannelMetrics(channelId: string, timeRange: TimeRangeQuery): Promise<ServiceOperationResult<ChannelActivityAnalytics>>;
	// 	getUserMetrics(userId: string, timeRange: TimeRangeQuery): Promise<ServiceOperationResult<UserInteractionAnalytics>>;

	// Aggregation methods
	getAggregatedMetrics(
		filter: BotMetricsFilter,
		timeRange: TimeRangeQuery,
	): Promise<ServiceOperationResult<BotMetricsAggregation[]>>;

	// Prometheus integration
	exportPrometheusMetrics(): Promise<ServiceOperationResult<string>>;

	// Health and maintenance
	getHealthStatus(): Promise<HealthCheckResult>;
	cleanup(): Promise<ServiceOperationResult<void>>;
}
