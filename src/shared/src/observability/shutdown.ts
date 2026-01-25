import { getLogsService } from './logs-service';
import { getMetricsService } from './metrics-service';

/**
 * Gracefully shutdown all observability services
 * This ensures all pending logs, metrics, and traces are flushed before exit
 *
 * @param serviceName - The service name (only used if services haven't been initialized yet;
 *                      otherwise the singleton instances are used regardless of this parameter)
 */
export async function shutdownObservability(serviceName: string): Promise<void> {
  const shutdownStart = Date.now();
  process.stderr.write(`[Observability] Starting graceful shutdown for ${serviceName}...\n`);

  try {
    // Flush logs
    // Note: getLogsService and getMetricsService are singletons, so the serviceName
    // parameter is only used if they haven't been initialized yet
    const logsService = getLogsService(serviceName);
    if (logsService.isEnabled()) {
      process.stderr.write('[Observability] Flushing pending logs...\n');
      await logsService.shutdown();
      process.stderr.write('[Observability] Logs flushed successfully\n');
    }

    // Flush metrics
    const metricsService = getMetricsService(serviceName);
    process.stderr.write('[Observability] Flushing pending metrics...\n');
    await metricsService.shutdown();
    process.stderr.write('[Observability] Metrics flushed successfully\n');

    const shutdownDuration = Date.now() - shutdownStart;
    process.stderr.write(`[Observability] Shutdown complete in ${shutdownDuration}ms\n`);
  } catch (error) {
    if (error instanceof Error) {
      const stackInfo = error.stack ? `\n${error.stack}` : '';
      process.stderr.write(`[Observability] Error during shutdown: ${error.message}${stackInfo}\n`);
    } else {
      process.stderr.write(`[Observability] Error during shutdown: ${String(error)}\n`);
    }
    throw error;
  }
}
