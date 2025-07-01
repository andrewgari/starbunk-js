// Shared utilities and services for all containers
export { logger } from './services/logger';
export { ensureError } from './utils/errorUtils';
export { validateEnvironment, getDebugMode, getTestingServerIds, getTestingChannelIds } from './utils/envValidation';
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
	deferInteractionReply
} from './discord/utils';

export { WebhookManager } from './services/webhookManager';
export { MessageFilter, getMessageFilter, resetMessageFilter } from './services/messageFilter';
export type { MessageContext, FilterResult } from './services/messageFilter';
export { DiscordService } from './services/discordService';
export { DatabaseService, getDatabaseService } from './services/database/databaseService';
export { ConfigurationRepository } from './services/database/configurationRepository';
export { ConfigurationService, getConfigurationService } from './services/configuration/configurationService';
export { UserService, getUserService, getUserId, getUsername, getUserConfig, createUserIdsObject } from './services/userService';
export type {
	BotConfigurationData,
	BotPatternData,
	BotResponseData,
	UserConfigurationData,
	ServerConfigurationData
} from './services/database/types';
export type {
	BotConfig,
	BotTriggerConfig,
	BotResponseConfig,
	UserConfig,
	ServerConfig
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
	getWebhookService
} from './services/bootstrap';

// Export container and ServiceId from container (uses Symbol values)
export { container, ServiceId } from './services/container';
