import chalk from 'chalk';

export interface ILogger {
	info(message: string): void;
	success(message: string): void;
	warn(message: string): void;
	error(message: string, error?: Error): void;
	debug(message: string): void;
	trace(message: string): void;
}

export class Logger implements ILogger {
	private static formatMessage(message: string, emoji: string): string {
		const timestamp = new Date().toISOString();
		return `${emoji}  ${chalk.gray(timestamp)} ${message}`;
	}

	private static getCallerInfo(): string {
		// Only calculate caller info in debug mode for performance
		if (process.env.DEBUG_MODE !== 'true') return '';

		const error = new Error();
		const stack = error.stack?.split('\n') || [];
		// Skip the first 3 lines (Error, getCallerInfo, and the logger method)
		const callerLine = stack[3] || '';
		const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
			callerLine.match(/at\s+()(.*):(\d+):(\d+)/);

		if (!match) return '';

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [, fnName, filePath, line, _col] = match;
		const fileName = filePath.split('/').pop() || '';
		const functionName = fnName || 'anonymous';

		return chalk.gray(` [${fileName}:${line} ${functionName}]`);
	}

	static info(message: string): void {
		// eslint-disable-next-line no-console
		console.log(this.formatMessage(message, '📝'));
	}

	static success(message: string): void {
		// eslint-disable-next-line no-console
		console.log(this.formatMessage(chalk.green(message), '✅'));
	}

	static warn(message: string): void {
		console.warn(this.formatMessage(chalk.yellow(message), '⚠️'));
	}

	static error(message: string, error?: Error): void {
		console.error(this.formatMessage(chalk.red(message), '❌'));
		if (error?.stack) {
			console.error(chalk.red(error.stack));
		}
	}

	static debug(message: string): void {
		if (process.env.DEBUG_MODE === 'true') {
			const callerInfo = this.getCallerInfo();
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.blue(message) + callerInfo, '🔍'));
		}
	}

	static trace(message: string): void {
		if (process.env.DEBUG_MODE === 'true') {
			const callerInfo = this.getCallerInfo();
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.magenta(message) + callerInfo, '🔬'));
			// eslint-disable-next-line no-console
			console.trace();
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

	trace(message: string): void {
		Logger.trace(message);
	}
}

// Singleton instance for backward compatibility
export const defaultLogger = new Logger();
