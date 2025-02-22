import chalk from 'chalk';

export class Logger {
	private static formatMessage(message: string, emoji: string): string {
		const timestamp = new Date().toISOString();
		return `${emoji}  ${chalk.gray(timestamp)} ${message}`;
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
		if (process.env.DEBUG) {
			// eslint-disable-next-line no-console
			console.log(this.formatMessage(chalk.blue(message), '🔍'));
		}
	}
}
