import { ILogger, Logger } from './logger';
import container from './serviceContainer';
import { serviceRegistry } from './serviceRegistry';

export class loggerFactory {
	private static instance: loggerFactory;

	private constructor() {
		// Register default logger if not already registered
		if (!container.has(serviceRegistry.LOGGER)) {
			// Use the default logger instance instead of creating a new one
			container.register(serviceRegistry.LOGGER, {
				debug: (message: string): void => Logger.debug(message),
				info: (message: string): void => Logger.info(message),
				success: (message: string): void => Logger.success(message),
				warn: (message: string): void => Logger.warn(message),
				error: (message: string, error?: Error): void => Logger.error(message, error),
			});
		}
	}

	static getInstance(): loggerFactory {
		if (!loggerFactory.instance) {
			loggerFactory.instance = new loggerFactory();
		}
		return loggerFactory.instance;
	}

	getLogger(): ILogger {
		return container.get<ILogger>(serviceRegistry.LOGGER) || new Logger();
	}

	// For testing purposes
	setLogger(logger: ILogger): void {
		container.register(serviceRegistry.LOGGER, logger);
	}
}

export default loggerFactory.getInstance();
