import { ILogger, Logger } from './Logger';

export class LoggerFactory {
	private static instance: LoggerFactory;
	private defaultLogger: ILogger;

	private constructor() {
		this.defaultLogger = new Logger();
	}

	static getInstance(): LoggerFactory {
		if (!LoggerFactory.instance) {
			LoggerFactory.instance = new LoggerFactory();
		}
		return LoggerFactory.instance;
	}

	getLogger(): ILogger {
		return this.defaultLogger;
	}

	// For testing purposes
	setLogger(logger: ILogger): void {
		this.defaultLogger = logger;
	}
}

export default LoggerFactory.getInstance();
