import { logger as baseLogger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { getStructuredLogger } from './StructuredLogger';

/**
 * Comprehensive bot response log entry
 * Captures all details about a bot's response to a message
 */
export interface BotResponseLog {
	// Core message data
	original_message: string;
	bot_response: string;
	timestamp: string;

	// Bot identity
	bot_name: string;
	nickname_used: string;
	avatar_url_used: string;

	// Trigger information
	trigger_condition: 'direct_mention' | 'keyword_match' | 'llm_decision' | 'random_chance' | 'pattern_match' | 'command';
	trigger_name: string;

	// Discord context
	user_id: string;
	channel_id: string;
	guild_id: string;

	// Optional metadata
	response_latency_ms?: number;
	llm_provider?: string;
	error_message?: string;
}

/**
 * Service for logging bot responses with comprehensive details
 * Integrates with existing Loki/Grafana observability stack
 */
export class BotResponseLogger {
	private readonly service: string;
	private readonly environment: string;

	constructor(service: string) {
		this.service = service;
		this.environment = process.env.NODE_ENV || 'development';
	}

	/**
	 * Log a successful bot response with all required fields
	 * Uses INFO level for production visibility
	 */
	logBotResponse(log: BotResponseLog): void {
		try {
			// Create structured log entry
			const structuredLog = {
				...log,
				service: this.service,
				environment: this.environment,
				log_type: 'bot_response',
				level: 'info',
			};

			// Log to console with structured format (console.log is correct for structured logging)
			// This allows log aggregators to parse JSON directly
			if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
				console.log(JSON.stringify(structuredLog));
			} else {
				// Fallback to formatted logging
				baseLogger.info(
					`[BOT_RESPONSE] ${log.bot_name} (as ${log.nickname_used}) responded to message from user ${log.user_id} in channel ${log.channel_id}`,
					{
						trigger: log.trigger_name,
						condition: log.trigger_condition,
						response_length: log.bot_response.length,
						latency_ms: log.response_latency_ms,
					},
				);
			}

			// Send to Loki via StructuredLogger
			const structuredLogger = getStructuredLogger();
			// Use the existing logMessageFlow method with extended data
			// Extended fields (nickname_used, avatar_url_used, trigger_condition) are supported
			// via the MessageFlowLog index signature [key: string]: unknown
			structuredLogger.logMessageFlow({
				event: 'bot_responded',
				bot_name: log.bot_name,
				condition_name: log.trigger_name,
				message_text: log.original_message,
				user_id: log.user_id,
				user_name: '', // Not available in this context
				channel_id: log.channel_id,
				channel_name: '', // Not available in this context
				guild_id: log.guild_id,
				response_text: log.bot_response,
				response_latency_ms: log.response_latency_ms,
				timestamp: log.timestamp,
				// Extended fields for bot response logging
				nickname_used: log.nickname_used,
				avatar_url_used: log.avatar_url_used,
				trigger_condition: log.trigger_condition,
			} as Parameters<typeof structuredLogger.logMessageFlow>[0]);
		} catch (error) {
			// Never let logging failures break bot functionality
			baseLogger.warn('Failed to log bot response:', ensureError(error));
		}
	}

	/**
	 * Log a bot response error
	 */
	logBotResponseError(botName: string, triggerName: string, error: Error, context: Partial<BotResponseLog>): void {
		try {
			const errorLog: BotResponseLog = {
				original_message: context.original_message || '',
				bot_response: '',
				timestamp: new Date().toISOString(),
				bot_name: botName,
				nickname_used: context.nickname_used || botName,
				avatar_url_used: context.avatar_url_used || '',
				trigger_condition: context.trigger_condition || 'pattern_match',
				trigger_name: triggerName,
				user_id: context.user_id || '',
				channel_id: context.channel_id || '',
				guild_id: context.guild_id || '',
				error_message: error.message,
			};

			this.logBotResponse(errorLog);
		} catch (logError) {
			baseLogger.warn('Failed to log bot response error:', ensureError(logError));
		}
	}
}

// Global bot response logger instances (one per service)
const botResponseLoggers = new Map<string, BotResponseLogger>();

/**
 * Get or create a bot response logger for a service
 */
export function getBotResponseLogger(service: string = 'starbunk'): BotResponseLogger {
	if (!botResponseLoggers.has(service)) {
		botResponseLoggers.set(service, new BotResponseLogger(service));
	}
	return botResponseLoggers.get(service)!;
}

