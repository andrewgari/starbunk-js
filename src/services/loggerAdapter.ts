import { ILogger } from './logger';
import loggerFactory from './loggerFactory';

/**
 * loggerAdapter provides a bridge between the static Logger usage and the new dependency-injected approach.
 * This helps with transitioning the codebase gradually.
 */
export class loggerAdapter {
	private static logger: ILogger = loggerFactory.getLogger();

	static setLogger(logger: ILogger): void {
		loggerAdapter.logger = logger;
	}

	static info(message: string): void {
		loggerAdapter.logger.info(message);
	}

	static success(message: string): void {
		loggerAdapter.logger.success(message);
	}

	static warn(message: string): void {
		loggerAdapter.logger.warn(message);
	}

	static error(message: string, error?: Error): void {
		loggerAdapter.logger.error(message, error);
	}

	static debug(message: string): void {
		loggerAdapter.logger.debug(message);
	}
}

export default loggerAdapter;
