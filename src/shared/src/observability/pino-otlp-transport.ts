import { trace } from '@opentelemetry/api';
import { LogsService } from './logs-service';
import type { DestinationStream } from 'pino';

/**
 * Pino log record structure
 */
interface PinoLogRecord {
	level: number;
	time: number;
	msg: string;
	pid?: number;
	hostname?: string;
	[key: string]: unknown;
}

/**
 * Pino destination stream that sends logs to OTLP
 * This bridges Pino/LogLayer to OpenTelemetry Logs SDK
 */
export class PinoOtlpDestination implements DestinationStream {
	private logsService: LogsService;

	constructor(serviceName: string) {
		this.logsService = new LogsService(serviceName);
	}

	/**
	 * Write a log record to OTLP
	 * This is called by Pino for each log entry
	 */
	write(chunk: string): void {
		if (!this.logsService.isEnabled()) {
			// If OTLP is disabled, write to stdout as fallback
			process.stdout.write(chunk);
			return;
		}

		try {
			const logRecord = JSON.parse(chunk) as PinoLogRecord;
			this.emitLogRecord(logRecord);
		} catch (_error) {
			// If parsing fails, write to stdout as fallback
			process.stdout.write(chunk);
		}
	}

	/**
	 * Emit a log record to OpenTelemetry
	 */
	private emitLogRecord(logRecord: PinoLogRecord): void {
		const loggerProvider = this.logsService.getLoggerProvider();
		if (!loggerProvider) return;

		const logger = loggerProvider.getLogger('pino-otlp-bridge', '1.0.0');

		// Extract trace context if available
		const activeSpan = trace.getActiveSpan();
		const spanContext = activeSpan?.spanContext();

		// Map Pino level to OpenTelemetry severity
		const severityNumber = LogsService.mapPinoLevelToSeverity(logRecord.level || 30);
		const severityText = this.getSeverityText(logRecord.level || 30);

		// Build attributes from log record
		const attributes: Record<string, string | number | boolean> = {};

		// Add all fields from the log record as attributes
		for (const [key, value] of Object.entries(logRecord)) {
			// Skip special fields that are handled separately
			if (key === 'level' || key === 'time' || key === 'msg' || key === 'pid' || key === 'hostname') {
				continue;
			}

			// Convert complex objects to strings
			if (typeof value === 'object' && value !== null) {
				attributes[key] = JSON.stringify(value);
			} else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				attributes[key] = value;
			} else {
				// For undefined or other types, convert to string
				attributes[key] = String(value);
			}
		}

		// Add trace context if available
		if (spanContext) {
			attributes['trace_id'] = spanContext.traceId;
			attributes['span_id'] = spanContext.spanId;
			attributes['trace_flags'] = spanContext.traceFlags;
		}

		// Emit the log record
		logger.emit({
			severityNumber,
			severityText,
			body: logRecord.msg || '',
			attributes,
			timestamp: logRecord.time ? new Date(logRecord.time) : new Date(),
		});
	}

	/**
	 * Get severity text from Pino level
	 */
	private getSeverityText(level: number): string {
		if (level <= 10) return 'TRACE';
		if (level <= 20) return 'DEBUG';
		if (level <= 30) return 'INFO';
		if (level <= 40) return 'WARN';
		if (level <= 50) return 'ERROR';
		return 'FATAL';
	}

	/**
	 * Flush any pending logs
	 */
	async flush(): Promise<void> {
		await this.logsService.shutdown();
	}
}

/**
 * Create a Pino destination that sends logs to OTLP
 */
export function createPinoOtlpDestination(serviceName: string): DestinationStream {
	return new PinoOtlpDestination(serviceName);
}

