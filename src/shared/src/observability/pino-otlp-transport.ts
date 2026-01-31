import { trace } from '@opentelemetry/api';
import { getLogsService, LogsService } from './logs-service';
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
    // Use the singleton LogsService instance to ensure shutdown flushes all logs
    this.logsService = getLogsService(serviceName);
  }

  /**
   * Write a log record to OTLP
   * This is called by Pino for each log entry
   */
  write(chunk: string): void {
    // Always write to stdout for Docker logs visibility
    process.stdout.write(chunk);

    // If OTLP is disabled, we're done
    if (!this.logsService.isEnabled()) {
      return;
    }

    try {
      const logRecord = JSON.parse(chunk) as PinoLogRecord;
      this.emitLogRecord(logRecord);
    } catch (error) {
      // Log parsing errors to stderr so we can debug
      const errorMsg = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[OTLP Bridge Error] Failed to parse log record: ${errorMsg}\n`);
    }
  }

  /**
   * Emit a log record to OpenTelemetry
   */
  private emitLogRecord(logRecord: PinoLogRecord): void {
    try {
      const loggerProvider = this.logsService.getLoggerProvider();
      if (!loggerProvider) {
        process.stderr.write('[OTLP Bridge] LoggerProvider not available\n');
        return;
      }

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
        if (
          key === 'level' ||
          key === 'time' ||
          key === 'msg' ||
          key === 'pid' ||
          key === 'hostname'
        ) {
          continue;
        }

        // Convert complex objects to strings
        if (typeof value === 'object' && value !== null) {
          try {
            attributes[key] = JSON.stringify(value);
          } catch {
            // Handle circular references or non-serializable objects
            attributes[key] = '[Circular or non-serializable]';
          }
        } else if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
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
    } catch (error) {
      // Log OTLP emission errors to stderr
      const errorMsg = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[OTLP Bridge Error] Failed to emit log to OTLP: ${errorMsg}\n`);
    }
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
