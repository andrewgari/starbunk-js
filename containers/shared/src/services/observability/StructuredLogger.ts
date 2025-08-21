import { logger as baseLogger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import fetch from 'node-fetch';
import { getNodeEnv } from '../../environment';

export interface LogContext {
	service: string;
	bot?: string;
	user_id?: string;
	user_name?: string;
	channel_id?: string;
	channel_name?: string;
	guild_id?: string;
	message_id?: string;
	correlation_id?: string;
	[key: string]: unknown;
}

export interface MessageFlowLog {
	event: 'message_received' | 'bot_triggered' | 'bot_skipped' | 'bot_responded' | 'bot_error';
	bot_name: string;
	condition_name?: string;
	message_text: string;
	user_id: string;
	user_name: string;
	channel_id: string;
	channel_name: string;
	guild_id: string;
	response_text?: string;
	response_latency_ms?: number;
	skip_reason?: string;
	percentage_chance?: number;
	circuit_breaker_open?: boolean;
	error_message?: string;
	timestamp: string;
}

export interface ChannelActivityLog {
	event: 'channel_activity';
	channel_id: string;
	channel_name: string;
	guild_id: string;
	message_count: number;
	user_count: number;
	bot_message_count: number;
	human_message_count: number;
	active_users: string[];
	timestamp: string;
}

export interface SystemLog {
	event: 'system_health' | 'circuit_breaker' | 'bot_loaded' | 'bot_unloaded';
	details: Record<string, unknown>;
	timestamp: string;
}

export class StructuredLogger {
	private readonly service: string;
	private readonly environment: string;
	private lokiClient?: LokiClient;

	constructor(service: string) {
		this.service = service;
		this.environment = getNodeEnv();

		if (process.env.ENABLE_STRUCTURED_LOGGING === 'true' && process.env.LOKI_URL) {
			this.lokiClient = new LokiClient(process.env.LOKI_URL, service);
		}
	}

	logMessageFlow(log: Partial<MessageFlowLog> & { event: MessageFlowLog['event']; bot_name: string }): void {
		const structuredLog: MessageFlowLog = {
			event: log.event,
			bot_name: log.bot_name,
			condition_name: log.condition_name,
			message_text: log.message_text || '',
			user_id: log.user_id || '',
			user_name: log.user_name || '',
			channel_id: log.channel_id || '',
			channel_name: log.channel_name || '',
			guild_id: log.guild_id || '',
			response_text: log.response_text,
			response_latency_ms: log.response_latency_ms,
			skip_reason: log.skip_reason,
			percentage_chance: log.percentage_chance,
			circuit_breaker_open: log.circuit_breaker_open,
			error_message: log.error_message,
			timestamp: new Date().toISOString(),
		};

		const context: LogContext = {
			service: this.service,
			environment: this.environment,
			log_type: 'message_flow',
			...structuredLog,
		};

		this.logWithLevel(log.event === 'bot_error' ? 'error' : 'info', log.event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					service: this.service,
					environment: this.environment,
					bot: log.bot_name,
					event: log.event,
					level: log.event === 'bot_error' ? 'error' : 'info',
				},
				values: [[Date.now() * 1000000, JSON.stringify(structuredLog)]],
			});
		}
	}

	logChannelActivity(log: ChannelActivityLog): void {
		const context: LogContext = {
			service: this.service,
			environment: this.environment,
			log_type: 'channel_activity',
			...log,
		};

		this.logWithLevel('info', 'channel_activity', context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					service: this.service,
					environment: this.environment,
					channel_id: log.channel_id,
					event: 'channel_activity',
					level: 'info',
				},
				values: [[Date.now() * 1000000, JSON.stringify(log)]],
			});
		}
	}

	logSystemEvent(log: SystemLog): void {
		const context: LogContext = {
			service: this.service,
			environment: this.environment,
			log_type: 'system',
			...log,
		};

		const level = log.event === 'circuit_breaker' ? 'warn' : 'info';
		this.logWithLevel(level, log.event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					service: this.service,
					environment: this.environment,
					event: log.event,
					level,
				},
				values: [[Date.now() * 1000000, JSON.stringify(log)]],
			});
		}
	}

	logBotInteraction(
		botName: string,
		event: 'trigger_evaluated' | 'condition_checked' | 'response_generated',
		details: Record<string, unknown>,
	): void {
		const context: LogContext = {
			service: this.service,
			environment: this.environment,
			bot: botName,
			log_type: 'bot_interaction',
			event,
			timestamp: new Date().toISOString(),
			...details,
		};

		this.logWithLevel('debug', event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					service: this.service,
					environment: this.environment,
					bot: botName,
					event,
					level: 'debug',
				},
				values: [[Date.now() * 1000000, JSON.stringify(context)]],
			});
		}
	}

	private logWithLevel(level: 'debug' | 'info' | 'warn' | 'error', message: string, context: LogContext): void {
		if (process.env.LOG_FORMAT === 'json') {
			const logEntry = {
				level,
				message,
				timestamp: new Date().toISOString(),
				...context,
			};
			console.log(JSON.stringify(logEntry));
		} else {
			// Use existing logger for non-JSON format
			switch (level) {
				case 'debug':
					baseLogger.debug(message, context);
					break;
				case 'info':
					baseLogger.info(message, context);
					break;
				case 'warn':
					baseLogger.warn(message, context);
					break;
				case 'error':
					baseLogger.error(message, ensureError(context as any));
					break;
			}
		}
	}
}

// Loki client for log shipping
interface LokiStream {
	stream: Record<string, string>;
	values: [number, string][];
}

class LokiClient {
	private readonly baseUrl: string;
	private readonly service: string;
	private buffer: LokiStream[] = [];
	private pushInterval?: NodeJS.Timeout;

	constructor(baseUrl: string, service: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.service = service;

		// Start buffered push every 5 seconds
		this.pushInterval = setInterval(() => {
			this.flush().catch((error) => {
				baseLogger.error('Failed to push logs to Loki:', ensureError(error));
			});
		}, 5000);
	}

	push(stream: LokiStream): void {
		this.buffer.push(stream);

		// Flush immediately if buffer is getting large
		if (this.buffer.length >= 100) {
			this.flush().catch((error) => {
				baseLogger.error('Failed to flush logs to Loki:', ensureError(error));
			});
		}
	}

	private async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		const payload = {
			streams: [...this.buffer],
		};

		this.buffer = [];

		try {
			const response = await fetch(`${this.baseUrl}/loki/api/v1/push`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(`Loki responded with ${response.status}: ${response.statusText}`);
			}

			baseLogger.debug(`Pushed ${payload.streams.length} log streams to Loki`);
		} catch (error) {
			baseLogger.error('Error pushing logs to Loki:', ensureError(error));
			// Put failed logs back in buffer for retry
			this.buffer.unshift(...payload.streams);
		}
	}

	shutdown(): void {
		if (this.pushInterval) {
			clearInterval(this.pushInterval);
			this.pushInterval = undefined;
		}

		// Final flush
		this.flush().catch((error) => {
			baseLogger.error('Failed final flush to Loki:', ensureError(error));
		});
	}
}

// Global structured logger instance
let globalStructuredLogger: StructuredLogger | undefined;

export function initializeStructuredLogger(service: string): StructuredLogger {
	if (globalStructuredLogger) {
		baseLogger.warn('Structured logger already initialized');
		return globalStructuredLogger;
	}

	globalStructuredLogger = new StructuredLogger(service);
	baseLogger.info(`Structured logger initialized for ${service}`);
	return globalStructuredLogger;
}

export function getStructuredLogger(): StructuredLogger {
	if (!globalStructuredLogger) {
		throw new Error('Structured logger not initialized. Call initializeStructuredLogger() first.');
	}
	return globalStructuredLogger;
}
