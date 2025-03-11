import chalk from 'chalk';
import { Logger as LoggerInterface, Service, ServiceId } from './services';

export enum LogLevel {
	NONE = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

// SUCCESS has the same level as INFO

@Service({
	id: ServiceId.Logger,
	scope: 'singleton'
})
export class Logger implements LoggerInterface {
	private static instance: Logger | null = null;

	constructor() {
		if (Logger.instance) {
			return Logger.instance;
		}
		Logger.instance = this;
	}

	debug(message: string): void {
		if (process.env.DEBUG_MODE === 'true') {
			console.debug(this.formatMessage(chalk.blue(message), '��'));
		}
	}

	info(message: string): void {
		console.info(this.formatMessage(chalk.white(message), 'ℹ️'));
	}

	warn(message: string): void {
		console.warn(this.formatMessage(chalk.yellow(message), '⚠️'));
	}

	error(message: string, error?: Error): void {
		console.error(this.formatMessage(chalk.red(message), '❌'));
		if (error) {
			console.error(error);
		}
	}

	success(message: string): void {
		console.log(this.formatMessage(chalk.green(message), '✅'));
	}

	formatMessage(message: string, icon = ''): string {
		const callerInfo = this.getCallerInfo();
		return `${icon} [${new Date().toISOString()}] ${callerInfo} ${message}`;
	}

	getCallerInfo(): string {
		const stackTrace = new Error().stack?.split('\n') || [];
		const callerLine = stackTrace[3] || '';
		const match = callerLine.match(/at (\S+)/);
		return match ? match[1] : 'unknown';
	}
}

// Export a singleton instance
export const logger = new Logger();
