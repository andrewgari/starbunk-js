// Shared utilities and services for all containers
export { logger } from './services/logger';
export { ensureError } from './utils/errorUtils';
export {
	validateEnvironment,
	getDebugMode,
	getTestingServerIds,
	getTestingChannelIds,
	validateObservabilityEnvironment,
	getObservabilityEnvVars,
	type ObservabilityConfig,
} from './utils/envValidation';
export { runStartupDiagnostics, StartupDiagnostics } from './utils/diagnostics';
export type { DiagnosticResult } from './utils/diagnostics';
export { isDebugMode, setDebugMode } from './environment';
export { createDiscordClient, ClientConfigs } from './discord/clientFactory';
export {
	getClientFromInteraction,
	getMemberFromInteraction,
	getUserFromInteraction,
	getGuildFromInteraction,
	isUserInVoiceChannel,
	getUserVoiceChannel,
	validateGuildInteraction,
	sendErrorResponse,
	sendSuccessResponse,
	deferInteractionReply,
} from './discord/utils';

export * from './utils/response';
export * from './utils/time';

export { WebhookManager } from './services/webhookManager';
export { MessageFilter, getMessageFilter, resetMessageFilter } from './services/messageFilter';
export type { FilterResult } from './services/messageFilter';
export { DiscordService } from './services/discordService';
export { DatabaseService, getDatabaseService } from './services/database/databaseService';
export { ConfigurationRepository } from './services/database/configurationRepository';
export { ConfigurationService, getConfigurationService } from './services/configuration/configurationService';
export {
	UserService,
	getUserService,
	getUserId,
	getUsername,
	getUserConfig,
	createUserIdsObject,
} from './services/userService';
export type {
	BotConfigurationData,
	BotPatternData,
	BotResponseData,
	UserConfigurationData,
	ServerConfigurationData,
} from './services/database/types';
export type {
	BotConfig,
	BotTriggerConfig,
	BotResponseConfig,
	UserConfig,
	ServerConfig,
} from './services/configuration/types';

// Bootstrap functions and service getters
export {
	bootstrapApplication,
	bootstrapSnowbunkApplication,
	getLogger,
	getDiscordClient,
	getDiscordService,
	getDiscordGMService,
	getLLMManager,
	getWebhookService,
	createLLMManagerWithTracker,
} from './services/bootstrap';

// Export container and ServiceId from container (uses Symbol values)
export { container, ServiceId } from './services/container';

// Add utility for closing resources
export async function closeAllConnections() {
	try {
		// Close database connections if using Prisma
		const { PrismaClient } = require('@prisma/client');
		const prisma = new PrismaClient();
		await prisma.$disconnect();
	} catch (error) {
		console.warn('[Shared] Could not close Prisma connection:', error);
	}

	try {
		// Close Discord client connections if applicable
		const { getDiscordClient } = require('./discord/clientFactory');
		const client = getDiscordClient();
		if (client && client.isReady()) {
			await client.destroy();
		}
	} catch (error) {
		console.warn('[Shared] Could not close Discord client:', error);
	}
}

// LLM and Prompt Management
export { PromptRegistry, PromptType } from './services/llm/promptManager';
export type { LLMPrompt } from './services/llm/promptManager';
export { LLMProviderType } from './services/llm/index';
export { getPersonalityService } from './services/personalityService';

// Observability - Production-ready metrics infrastructure
export {
	initializeObservability,
	initializeObservabilityLegacy,
	shutdownObservability,
	ProductionMetricsService,
	MetricsService,
	initializeMetrics,
	getMetrics,
	StructuredLogger,
	initializeStructuredLogger,
	getStructuredLogger,
	ChannelActivityTracker,
	initializeChannelActivityTracker,
	getChannelActivityTracker,
	HttpEndpointsService,
	initializeHttpEndpoints,
	getHttpEndpoints,
	// Container-specific metrics
	BunkBotMetricsCollector,
	createBunkBotMetrics,
	DJCovaMetricsCollector,
	createDJCovaMetrics,
	StarbunkDNDMetricsCollector,
	createStarbunkDNDMetrics,
	CovaBotMetricsCollector,
	createCovaBotMetrics,
	ContainerMetricsBase,
	// Bot Trigger Metrics Service
	BotTriggerMetricsService,
	createBotTriggerMetricsService,
	initializeBotTriggerMetricsService,
	getBotTriggerMetricsService,
	createProductionConfig,
	// Bot Trigger Integration
	EnhancedBunkBotMetricsCollector,
	createEnhancedBunkBotMetrics,
	BotTriggerTracker,
	createEnvironmentConfig,
	initializeBotMetricsSystem,
} from './services/observability';
export type {
	MessageFlowMetrics,
	ChannelActivity,
	LogContext,
	MessageFlowLog,
	ChannelActivityLog,
	SystemLog,
	MetricsConfiguration,
	EndpointsConfig,
	HealthCheckFunction,
	HealthCheckResult,
	// Container-specific metrics types
	BunkBotMetrics,
	DJCovaMetrics,
	StarbunkDNDMetrics,
	CovaBotMetrics,
	MessageContext,
	ContainerMetricsFactory,
	ContainerMetricsConfig,
} from './services/observability';

// Bot metrics types (MessageContext is re-exported from observability)
export type {
	BotTriggerEvent,
	BotMetricsFilter,
	// 	BotPerformanceAnalytics,
	// 	ChannelActivityAnalytics,
	// 	UserInteractionAnalytics,
	BotMetricsAggregation,
	TimeRangeQuery,
	BotMetricsServiceConfig,
	ServiceOperationResult,
	HealthCheckResult as BotMetricsHealthCheck,
	IBotTriggerMetricsService,
	CircuitBreakerState,
	RedisConfiguration,
	PrometheusMetricsExport,
	BatchOperationResult,
} from './types/bot-metrics';

// Bot trigger integration types
export type { BotTriggerIntegrationConfig } from './services/observability';

// Testing utilities
export {
	FakeDiscordClient,
	FakeDiscordEnvironment,
	MessageCapture,
} from './testing/discord';
export type {
	FakeDiscordEnvironmentConfig,
	CapturedMessage,
} from './testing/discord';

// LLM Testing utilities
export {
	LLMCallTracker,
	MockLLMProvider,
	createMockLLMProvider,
	createMockLLMSetup,
	assertLLMCalled,
	assertFallbackUsed,
	assertActualLLMUsed, // Legacy alias
	assertEmulatorUsed, // Legacy alias
} from './testing/llm';
export type {
	LLMCallRecord,
	LLMCallStats,
	MockResponseConfig,
} from './testing/llm';
