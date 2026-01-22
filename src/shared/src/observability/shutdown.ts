import { getLogsService } from './logs-service';
import { getMetricsService } from './metrics-service';

/**
 * Gracefully shutdown all observability services
 * This ensures all pending logs, metrics, and traces are flushed before exit
 */
export async function shutdownObservability(serviceName: string): Promise<void> {
	const shutdownStart = Date.now();
	process.stderr.write(`[Observability] Starting graceful shutdown for ${serviceName}...\n`);

	try {
		// Flush logs
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
		process.stderr.write(`[Observability] Error during shutdown: ${error}\n`);
		throw error;
	}
}

