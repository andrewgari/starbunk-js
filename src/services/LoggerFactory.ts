import { ILogger, Logger } from './Logger';
import container from './ServiceContainer';
import { ServiceRegistry } from './ServiceRegistry';

export class LoggerFactory {
	private static instance: LoggerFactory;

	private constructor() {
		// Register default logger if not already registered
		if (!container.has(ServiceRegistry.LOGGER)) {
			// Use the default logger instance instead of creating a new one
			container.register(ServiceRegistry.LOGGER, {
				debug: (message: string): void => Logger.debug(message),
				info: (message: string): void => Logger.info(message),
				success: (message: string): void => Logger.success(message),
				warn: (message: string): void => Logger.warn(message),
				error: (message: string, error?: Error): void => Logger.error(message, error),
			});
		}
	}

	static getInstance(): LoggerFactory {
		if (!LoggerFactory.instance) {
			LoggerFactory.instance = new LoggerFactory();
		}
		return LoggerFactory.instance;
	}

	getLogger(): ILogger {
		return container.get<ILogger>(ServiceRegistry.LOGGER) || new Logger();
	}

	// For testing purposes
	setLogger(logger: ILogger): void {
		container.register(ServiceRegistry.LOGGER, logger);
	}
}

export default LoggerFactory.getInstance();
