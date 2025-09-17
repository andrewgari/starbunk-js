import chalk from 'chalk';
import { isDebugMode } from '../environment';
import { Logger as LoggerInterface } from './container';

interface LogEntry {
	level: string;
	timestamp: string;
	message: string;
	service?: string;
	caller?: string;
	data?: unknown;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
}

export enum LogLevel {
	NONE = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

// SUCCESS has the same level as INFO

// Logger is now manually instantiated instead of using the @Service decorator
export class Logger implements LoggerInterface {
	private currentLogLevel: LogLevel = LogLevel.INFO;
	private structuredLoggingEnabled = false;
	private serviceName?: string;

	constructor() {
		// Check if structured logging is enabled via environment variable
		this.structuredLoggingEnabled = process.env.ENABLE_STRUCTURED_LOGGING === 'true';
		this.serviceName = process.env.SERVICE_NAME || process.env.CONTAINER_NAME;
	}

	setLogLevel(level: LogLevel): void {
		this.currentLogLevel = level;
	}

	setServiceName(serviceName: string): void {
		this.serviceName = serviceName;
	}

	enableStructuredLogging(enabled: boolean): void {
		this.structuredLoggingEnabled = enabled;
	}

	private shouldLog(level: LogLevel): boolean {
		return level <= this.currentLogLevel;
	}

	// accept a spread of parameters
	debug(message: string, ...args: unknown[]): void {
		if (isDebugMode() && this.shouldLog(LogLevel.DEBUG)) {
			this.log('debug', message, ...args);
		}
	}

	info(message: string, ...args: unknown[]): void {
		if (this.shouldLog(LogLevel.INFO)) {
			this.log('info', message, ...args);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.shouldLog(LogLevel.WARN)) {
			this.log('warn', message, ...args);
		}
	}

	error(message: string, error?: Error, ...args: unknown[]): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			this.log('error', message, error, ...args);
		}
	}

	success(message: string, ...args: unknown[]): void {
		if (this.shouldLog(LogLevel.INFO)) {
			// Success uses INFO level
			this.log('info', message, ...args);
		}
	}

	private log(level: string, message: string, ...args: unknown[]): void {
		if (this.structuredLoggingEnabled) {
			this.logStructured(level, message, ...args);
		} else {
			this.logFormatted(level, message, ...args);
		}
	}

	private logStructured(level: string, message: string, ...args: unknown[]): void {
		const logEntry: LogEntry = {
			level,
			timestamp: new Date().toISOString(),
			message,
		};

		if (this.serviceName) {
			logEntry.service = this.serviceName;
		}

		// Add caller info if not in production
		if (process.env.NODE_ENV !== 'production') {
			logEntry.caller = this.getCallerInfo();
		}

		// Process additional arguments
		const processedArgs = this.processLogArgs(args);
		if (processedArgs.error) {
			logEntry.error = processedArgs.error;
		}
		if (processedArgs.data && Object.keys(processedArgs.data).length > 0) {
			logEntry.data = processedArgs.data;
		}

		// Output clean JSON
		console.log(JSON.stringify(logEntry));
	}

	private logFormatted(level: string, message: string, ...args: unknown[]): void {
		const icon = this.getLevelIcon(level);
		const coloredMessage = this.colorizeMessage(level, message);
		const formattedMessage = this.formatMessage(coloredMessage, icon);

		switch (level) {
			case 'debug':
				console.debug(formattedMessage, ...args);
				break;
			case 'info':
				console.info(formattedMessage, ...args);
				break;
			case 'warn':
				console.warn(formattedMessage, ...args);
				break;
			case 'error':
				console.error(formattedMessage, ...args);
				break;
			default:
				console.log(formattedMessage, ...args);
		}
	}

	private processLogArgs(args: unknown[]): { data?: Record<string, unknown>; error?: LogEntry['error'] } {
		const result: { data?: Record<string, unknown>; error?: LogEntry['error'] } = {};
		const data: Record<string, unknown> = {};

		for (const arg of args) {
			if (arg instanceof Error) {
				result.error = {
					name: arg.name,
					message: arg.message,
					stack: arg.stack,
				};
			} else if (arg !== null && typeof arg === 'object') {
				Object.assign(data, arg);
			} else if (arg !== undefined) {
				// For primitive values, add them as 'extra' data
				if (!data.extra) {
					data.extra = [];
				}
				(data.extra as unknown[]).push(arg);
			}
		}

		if (Object.keys(data).length > 0) {
			result.data = data;
		}

		return result;
	}

	private getLevelIcon(level: string): string {
		switch (level) {
			case 'debug':
				return '🐛';
			case 'info':
				return 'ℹ️';
			case 'warn':
				return '⚠️';
			case 'error':
				return '❌';
			default:
				return '✅';
		}
	}

	private colorizeMessage(level: string, message: string): string {
		switch (level) {
			case 'debug':
				return chalk.blue(message);
			case 'info':
				return chalk.white(message);
			case 'warn':
				return chalk.yellow(message);
			case 'error':
				return chalk.red(message);
			default:
				return chalk.green(message);
		}
	}

	formatMessage(message: string, icon = ''): string {
		const callerInfo = this.getCallerInfo();
		return `${icon} [${new Date().toISOString()}] ${callerInfo} ${message}`;
	}

	private getCallerInfo(): string {
		const stackTrace = new Error().stack?.split('\n') || [];
		const callerLine = stackTrace[3] || '';
		const match = callerLine.match(/at (\S+)/);
		return match ? match[1] : 'unknown';
	}
}

// Singleton instance
const loggerInstance = new Logger();

// Helper function to get logger instance - now returns the singleton directly
export function getLogger(): Logger {
	return loggerInstance;
}

// Export a logger instance for convenience
export const logger = loggerInstance;
