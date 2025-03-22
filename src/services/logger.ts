import chalk from 'chalk';
import { Logger as LoggerInterface } from './container';

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
	// accept a spread of parameters
	debug(message: string, ...args: unknown[]): void {
		if (process.env.DEBUG_MODE === 'true') {
			console.debug(this.formatMessage(chalk.blue(message), '🐛'), ...args);
		}
	}

	info(message: string, ...args: unknown[]): void {
		console.info(this.formatMessage(chalk.white(message), 'ℹ️'), ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		console.warn(this.formatMessage(chalk.yellow(message), '⚠️'), ...args);
	}

	error(message: string, error?: Error, ...args: unknown[]): void {
		console.error(this.formatMessage(chalk.red(message), '❌'), error, ...args);
	}

	success(message: string, ...args: unknown[]): void {
		console.log(this.formatMessage(chalk.green(message), '✅'), ...args);
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
