import { ILogger } from './Logger';
import loggerFactory from './LoggerFactory';

/**
 * LoggerAdapter provides a bridge between the static Logger usage and the new dependency-injected approach.
 * This helps with transitioning the codebase gradually.
 */
export class LoggerAdapter {
	private static logger: ILogger = loggerFactory.getLogger();

	static setLogger(logger: ILogger): void {
		LoggerAdapter.logger = logger;
	}

	static info(message: string): void {
		LoggerAdapter.logger.info(message);
	}

	static success(message: string): void {
		LoggerAdapter.logger.success(message);
	}

	static warn(message: string): void {
		LoggerAdapter.logger.warn(message);
	}

	static error(message: string, error?: Error): void {
		LoggerAdapter.logger.error(message, error);
	}

	static debug(message: string): void {
		LoggerAdapter.logger.debug(message);
	}
}

export default LoggerAdapter;
