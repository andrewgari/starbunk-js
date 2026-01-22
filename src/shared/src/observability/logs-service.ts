import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

/**
 * Logs service for Discord bots
 * Sends structured logs via OTLP to the collector
 */
export class LogsService {
	private loggerProvider: LoggerProvider | null = null;
	private enabled: boolean;
	private serviceName: string;

	constructor(serviceName: string) {
		this.enabled = process.env.OTEL_ENABLED !== 'false'; // Enabled by default
		this.serviceName = serviceName;

		if (this.enabled) {
			this.initializeOtlpExport();
		}
	}

	/**
	 * Initialize OTLP logs export
	 */
	private initializeOtlpExport(): void {
		const otlpUrl = this.getOtlpLogsUrl();

		const logExporter = new OTLPLogExporter({
			url: otlpUrl,
		});

		const logRecordProcessor = new BatchLogRecordProcessor(logExporter, {
			maxQueueSize: 2048,
			maxExportBatchSize: 512,
			scheduledDelayMillis: 5000, // 5 seconds
		});

		this.loggerProvider = new LoggerProvider({
			resource: resourceFromAttributes({
				[ATTR_SERVICE_NAME]: this.serviceName,
			}),
			processors: [logRecordProcessor],
		});

		// Set as global logger provider
		logs.setGlobalLoggerProvider(this.loggerProvider);
	}

	/**
	 * Get the OTLP logs endpoint URL
	 * Constructs URL from OTEL_COLLECTOR_HOST and OTEL_COLLECTOR_HTTP_PORT
	 */
	private getOtlpLogsUrl(): string {
		const host = process.env.OTEL_COLLECTOR_HOST || 'localhost';
		const port = process.env.OTEL_COLLECTOR_HTTP_PORT || '4318';
		return `http://${host}:${port}/v1/logs`;
	}

	/**
	 * Map Pino log level to OpenTelemetry severity number
	 */
	static mapPinoLevelToSeverity(level: number): SeverityNumber {
		// Pino levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
		if (level <= 10) return SeverityNumber.TRACE;
		if (level <= 20) return SeverityNumber.DEBUG;
		if (level <= 30) return SeverityNumber.INFO;
		if (level <= 40) return SeverityNumber.WARN;
		if (level <= 50) return SeverityNumber.ERROR;
		return SeverityNumber.FATAL;
	}

	/**
	 * Get the logger provider instance
	 */
	getLoggerProvider(): LoggerProvider | null {
		return this.loggerProvider;
	}

	/**
	 * Check if logs service is enabled
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Shutdown the logs service and flush any pending logs
	 */
	async shutdown(): Promise<void> {
		if (this.loggerProvider) {
			await this.loggerProvider.shutdown();
		}
	}
}

/**
 * Singleton instance for the logs service
 */
let logsServiceInstance: LogsService | null = null;

/**
 * Get or create the logs service instance
 */
export function getLogsService(serviceName: string): LogsService {
	if (!logsServiceInstance) {
		logsServiceInstance = new LogsService(serviceName);
	}
	return logsServiceInstance;
}

