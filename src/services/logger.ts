import chalk from 'chalk';

export enum LogLevel {
	NONE = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

// SUCCESS has the same level as INFO
const SUCCESS_LEVEL = LogLevel.INFO;

export interface ILogger {
	info(message: string): void;
	success(message: string): void;
	warn(message: string): void;
	error(message: string, error?: Error): void;
	debug(message: string): void;
}

export class Logger implements ILogger {
	private static logLevel: LogLevel = LogLevel.INFO;

	static {
		// Initialize log level from environment
		const envLogLevel = process.env.DEBUG_LOG_LEVEL 
			? parseInt(process.env.DEBUG_LOG_LEVEL, 10) 
			: undefined;
			
		if (envLogLevel !== undefined && !isNaN(envLogLevel) && envLogLevel >= 0 && envLogLevel <= 4) {
			this.logLevel = envLogLevel;
		} else if (process.env.DEBUG === 'true') {
			this.logLevel = LogLevel.DEBUG;
		}
	}

	private static formatMessage(message: string, emoji: string): string {
		const timestamp = new Date().toISOString();
		return `${emoji}  ${chalk.gray(timestamp)} ${message}`;
	}

	private static shouldLog(level: LogLevel): boolean {
		return level <= this.logLevel;
	}

	static info(message: string): void {
		if (this.shouldLog(LogLevel.INFO)) {
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(message, '📝'));
		}
	}

	static success(message: string): void {
		if (this.shouldLog(SUCCESS_LEVEL)) {
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.green(message), '✅'));
		}
	}

	static warn(message: string): void {
		if (this.shouldLog(LogLevel.WARN)) {
			console.warn(this.formatMessage(chalk.yellow(message), '⚠️'));
		}
	}

	static error(message: string, error?: Error): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			console.error(this.formatMessage(chalk.red(message), '❌'));
			if (error?.stack) {
				console.error(chalk.red(error.stack));
			}
		}
	}

	static debug(message: string): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.blue(message), '🔍'));
		}
	}

	// Instance methods that delegate to static methods
	info(message: string): void {
		Logger.info(message);
	}

	success(message: string): void {
		Logger.success(message);
	}

	warn(message: string): void {
		Logger.warn(message);
	}

	error(message: string, error?: Error): void {
		Logger.error(message, error);
	}

	debug(message: string): void {
		Logger.debug(message);
	}
}

// Singleton instance for backward compatibility
export const defaultLogger = new Logger();
