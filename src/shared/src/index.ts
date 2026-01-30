// Shared utilities and services for all containers

// Core logger
export { logLayer } from './observability/log-layer';

// LogLayer mixins for structured logging
export {
  discordContextMixin,
  performanceMixin,
  botContextMixin,
  registerStarbunkMixins,
} from './observability/mixins';

// Tracing service
export { TraceService, getTraceService } from './observability/trace-service';
export type {
  DiscordMessageContext,
  IDiscordContextMixin,
  PerformanceContext,
  IPerformanceMixin,
  BotContext,
  IBotContextMixin,
} from './observability/mixins';

// Types
export type { BotIdentity } from './types/bot-identity';
export type {
  SimulacrumProfile,
  SaliencyResult,
  SocialBatteryResult,
  SimulacrumDecision,
} from './types/personality';
export { IGNORE_CONVERSATION_MARKER, buildSelectiveObserverPrompt } from './types/personality';

// Discord services
export { DiscordService } from './discord/discord-service';
export { WebhookService } from './discord/webhook-service';
export {
  CommandRegistry,
  deployCommands,
  setupCommandHandlers,
  initializeCommands,
} from './discord/command-registry';
export type { Command } from './discord/command-registry';

// LLM services
export type {
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from './services/llm';
export { LlmProviderManager } from './services/llm/llm-provider-manager';
export { OpenAIProvider } from './services/llm/openai-provider';
export { GeminiProvider } from './services/llm/gemini-provider';
export { OllamaProvider } from './services/llm/ollama-provider';

// Ollama model management
export { OllamaModelManager } from './services/llm/ollama-model-manager';

// Data access
export { BaseRepository } from './data-access/base/base-repository';
export { PostgresBaseRepository } from './data-access/base/postgres-base-repository';

// Reactive utilities
export { LiveData } from './utils/live-data';
export type { ReadonlyLiveData, SubscribeOptions, Unsubscribe } from './utils/live-data';
