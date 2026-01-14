/**
 * Structured logger for bluebot
 * Supports JSON logging for Promtail/Loki integration
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	service: string;
	[key: string]: unknown;
}

class Logger {
	private serviceName: string;
	private structuredLogging: boolean;

	constructor(serviceName: string = 'bluebot') {
		this.serviceName = serviceName;
		this.structuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === 'true';
	}

	debug(message: string, context?: Record<string, unknown>): void {
		if (process.env.DEBUG_MODE === 'true') {
			this.log('debug', message, context);
		}
	}

	info(message: string, context?: Record<string, unknown>): void {
		this.log('info', message, context);
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.log('warn', message, context);
	}

	error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
		const errorContext = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
		this.log('error', message, { ...errorContext, ...context });
	}

	private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
		if (this.structuredLogging) {
			this.logStructured(level, message, context);
		} else {
			this.logFormatted(level, message, context);
		}
	}

	private logStructured(level: LogLevel, message: string, context?: Record<string, unknown>): void {
		const logEntry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			service: this.serviceName,
			...context,
		};
		console.log(JSON.stringify(logEntry));
	}

	private logFormatted(level: LogLevel, message: string, context?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const levelUpper = level.toUpperCase().padEnd(5);
		const prefix = `[${timestamp}] [${levelUpper}] [${this.serviceName}]`;

		if (context && Object.keys(context).length > 0) {
			console.log(`${prefix} ${message}`, context);
		} else {
			console.log(`${prefix} ${message}`);
		}
	}
}

// Singleton instance
let loggerInstance: Logger | undefined;

export function getLogger(): Logger {
	if (!loggerInstance) {
		loggerInstance = new Logger();
	}
	return loggerInstance;
}

export const logger = getLogger();
