class Logger {
	private serviceName: string;
	private structuredLogging: boolean;

	constructor(serviceName: string = 'bunkbot') {
		this.serviceName = serviceName;
		this.structuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === 'true';
	}

	debug(message: string, context?: Record<string, unknown>): void {
		if (process.env.DEBUG_MODE === 'true') {
			this.log('debug', message, context);
		}
	}

	info(message: string, context?: Record<string, unknown>): void {
		this.log('info', message, context);
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.log('warn', message, context);
	}

	error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
		const errorContext = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
		this.log('error', message, { ...errorContext, ...context });
	}

	success(message: string, context?: Record<string, unknown>): void {
		this.log('info', message, context);
	}

	setServiceName(serviceName: string): void {
		this.serviceName = serviceName;
	}

	enableStructuredLogging(enabled: boolean): void {
		this.structuredLogging = enabled;
	}

	private log(level: string, message: string, context?: Record<string, unknown>): void {
		if (this.structuredLogging) {
			this.logStructured(level, message, context);
		} else {
			this.logFormatted(level, message, context);
		}
	}

	private logStructured(level: string, message: string, context?: Record<string, unknown>): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			level: level.toUpperCase(),
			service: this.serviceName,
			message,
			...context,
		};
		console.log(JSON.stringify(logEntry));
	}

	private logFormatted(level: string, message: string, context?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const levelUpper = level.toUpperCase().padEnd(5);
		const contextStr = context ? ` ${JSON.stringify(context)}` : '';
		console.log(`[${timestamp}] [${levelUpper}] [${this.serviceName}] ${message}${contextStr}`);
	}
}

export const logger = new Logger('covabot');
