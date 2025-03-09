import chalk from 'chalk';

export class Logger {
	private static instance: Logger;

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	private formatMessage(message: string, icon = ''): string {
		const timestamp = new Date().toISOString();
		return `${icon} [${timestamp}] ${message}`;
	}

	private getCallerInfo(): string {
		const error = new Error();
		const stack = error.stack?.split('\n')[3];
		if (!stack) return '';
		const match = stack.match(/at\s+(\S+)\s+\((.+):(\d+):(\d+)\)/);
		if (!match) return '';
		const [, func, file, line] = match;
		return ` (${func} at ${file}:${line})`;
	}

	info(message: string): void {
		// eslint-disable-next-line no-console
		console.log(this.formatMessage(message, '📝'));
	}

	success(message: string): void {
		// eslint-disable-next-line no-console
		console.log(this.formatMessage(chalk.green(message), '✅'));
	}

	warn(message: string): void {
		console.warn(this.formatMessage(chalk.yellow(message), '⚠️'));
	}

	error(message: string, error?: Error): void {
		console.error(this.formatMessage(chalk.red(message), '❌'));
		if (error?.stack) {
			console.error(chalk.red(error.stack));
		}
	}

	debug(message: string): void {
		if (process.env.DEBUG_MODE === 'true') {
			const callerInfo = this.getCallerInfo();
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.blue(message) + callerInfo, '🔍'));
		}
	}
}

// Export a singleton instance
export const logger = Logger.getInstance();
