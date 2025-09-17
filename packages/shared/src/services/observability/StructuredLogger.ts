import { logger as baseLogger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import fetch from 'node-fetch';

export interface LogContext {
	service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	bot?: string;
	user_id?: string;
	user_name?: string;
	channel_id?: string;
	channel_name?: string;
	guild_id?: string;
	message_id?: string;
	correlation_id?: string;
	[key: string]: unknown; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export interface MessageFlowLog {
	event: 'message_received' | 'bot_triggered' | 'bot_skipped' | 'bot_responded' | 'bot_error'; // eslint-disable-line @typescript-eslint/no-unused-vars
	bot_name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	condition_name?: string;
	message_text: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	user_id: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	user_name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channel_id: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channel_name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guild_id: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	response_text?: string;
	response_latency_ms?: number;
	skip_reason?: string;
	percentage_chance?: number;
	circuit_breaker_open?: boolean;
	error_message?: string;
	timestamp: string; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export interface ChannelActivityLog {
	event: 'channel_activity'; // eslint-disable-line @typescript-eslint/no-unused-vars
	channel_id: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channel_name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guild_id: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	message_count: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	user_count: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	bot_message_count: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	human_message_count: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	active_users: string[]; // eslint-disable-line @typescript-eslint/no-unused-vars
	timestamp: string; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export interface SystemLog {
	event: 'system_health' | 'circuit_breaker' | 'bot_loaded' | 'bot_unloaded'; // eslint-disable-line @typescript-eslint/no-unused-vars
	details: Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
	timestamp: string; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export class StructuredLogger {
	private readonly service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly environment: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private lokiClient?: LokiClient;

	constructor(service: string) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.service = service;
		this.environment = process.env.NODE_ENV || 'development';

		if (process.env.ENABLE_STRUCTURED_LOGGING === 'true' && process.env.LOKI_URL) {
			this.lokiClient = new LokiClient(process.env.LOKI_URL, service);
		}
	}

	logMessageFlow(log: Partial<MessageFlowLog> & { event: MessageFlowLog['event']; bot_name: string }): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const structuredLog: MessageFlowLog = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			event: log.event, // eslint-disable-line @typescript-eslint/no-unused-vars
			bot_name: log.bot_name, // eslint-disable-line @typescript-eslint/no-unused-vars
			condition_name: log.condition_name, // eslint-disable-line @typescript-eslint/no-unused-vars
			message_text: log.message_text || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			user_id: log.user_id || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			user_name: log.user_name || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			channel_id: log.channel_id || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			channel_name: log.channel_name || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			guild_id: log.guild_id || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			response_text: log.response_text, // eslint-disable-line @typescript-eslint/no-unused-vars
			response_latency_ms: log.response_latency_ms, // eslint-disable-line @typescript-eslint/no-unused-vars
			skip_reason: log.skip_reason, // eslint-disable-line @typescript-eslint/no-unused-vars
			percentage_chance: log.percentage_chance, // eslint-disable-line @typescript-eslint/no-unused-vars
			circuit_breaker_open: log.circuit_breaker_open, // eslint-disable-line @typescript-eslint/no-unused-vars
			error_message: log.error_message, // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};

		const context: LogContext = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
			log_type: 'message_flow', // eslint-disable-line @typescript-eslint/no-unused-vars
			...structuredLog,
		};

		this.logWithLevel(log.event === 'bot_error' ? 'error' : 'info', log.event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
					environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
					bot: log.bot_name, // eslint-disable-line @typescript-eslint/no-unused-vars
					event: log.event, // eslint-disable-line @typescript-eslint/no-unused-vars
					level: log.event === 'bot_error' ? 'error' : 'info', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				values: [[Date.now() * 1000000, JSON.stringify(structuredLog)]], // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	logChannelActivity(log: ChannelActivityLog): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const context: LogContext = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
			log_type: 'channel_activity', // eslint-disable-line @typescript-eslint/no-unused-vars
			...log,
		};

		this.logWithLevel('info', 'channel_activity', context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
					environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
					channel_id: log.channel_id, // eslint-disable-line @typescript-eslint/no-unused-vars
					event: 'channel_activity', // eslint-disable-line @typescript-eslint/no-unused-vars
					level: 'info', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				values: [[Date.now() * 1000000, JSON.stringify(log)]], // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	logSystemEvent(log: SystemLog): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const context: LogContext = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
			log_type: 'system', // eslint-disable-line @typescript-eslint/no-unused-vars
			...log,
		};

		const level = log.event === 'circuit_breaker' ? 'warn' : 'info';
		this.logWithLevel(level, log.event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
					environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
					event: log.event, // eslint-disable-line @typescript-eslint/no-unused-vars
					level,
				},
				values: [[Date.now() * 1000000, JSON.stringify(log)]], // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	logBotInteraction(
		botName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
		event: 'trigger_evaluated' | 'condition_checked' | 'response_generated', // eslint-disable-line @typescript-eslint/no-unused-vars
		details: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
	): void {
		const context: LogContext = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
			bot: botName, // eslint-disable-line @typescript-eslint/no-unused-vars
			log_type: 'bot_interaction', // eslint-disable-line @typescript-eslint/no-unused-vars
			event,
			timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			...details,
		};

		this.logWithLevel('debug', event, context);

		if (this.lokiClient) {
			this.lokiClient.push({
				stream: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
					environment: this.environment, // eslint-disable-line @typescript-eslint/no-unused-vars
					bot: botName, // eslint-disable-line @typescript-eslint/no-unused-vars
					event,
					level: 'debug', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				values: [[Date.now() * 1000000, JSON.stringify(context)]], // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	private logWithLevel(level: 'debug' | 'info' | 'warn' | 'error', message: string, context: LogContext): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
			const logEntry = {
				level,
				message,
				timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
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
	stream: Record<string, string>; // eslint-disable-line @typescript-eslint/no-unused-vars
	values: [number, string][]; // eslint-disable-line @typescript-eslint/no-unused-vars
}

class LokiClient {
	private readonly baseUrl: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private buffer: LokiStream[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars
	private pushInterval?: NodeJS.Timeout;

	constructor(baseUrl: string, service: string) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.service = service;

		// Start buffered push every 5 seconds
		this.pushInterval = setInterval(() => {
			this.flush().catch((error) => {
				baseLogger.error('Failed to push logs to Loki:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}, 5000);
	}

	push(stream: LokiStream): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.buffer.push(stream);

		// Flush immediately if buffer is getting large
		if (this.buffer.length >= 100) {
			this.flush().catch((error) => {
				baseLogger.error('Failed to flush logs to Loki:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	private async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		const payload = {
			streams: [...this.buffer], // eslint-disable-line @typescript-eslint/no-unused-vars
		};

		this.buffer = [];

		try {
			const response = await fetch(`${this.baseUrl}/loki/api/v1/push`, {
				method: 'POST', // eslint-disable-line @typescript-eslint/no-unused-vars
				headers: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			if (!response.ok) {
				throw new Error(`Loki responded with ${response.status}: ${response.statusText}`);
			}

			baseLogger.debug(`Pushed ${payload.streams.length} log streams to Loki`);
		} catch (error) {
			baseLogger.error('Error pushing logs to Loki:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
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
			baseLogger.error('Failed final flush to Loki:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}
}

// Global structured logger instance
let globalStructuredLogger: StructuredLogger | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

export function initializeStructuredLogger(service: string): StructuredLogger {
	// eslint-disable-line @typescript-eslint/no-unused-vars
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
