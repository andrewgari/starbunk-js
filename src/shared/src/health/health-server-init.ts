import { getHealthServer } from '../observability/health-server';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('HealthServer');

/**
 * Initializes and starts the health and metrics server.
 *
 * @returns The health server instance
 */
export async function initializeHealthServer() {
	const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);

	logger
		.withMetadata({ port: metricsPort })
		.info('Starting health and metrics server');
	const healthServer = getHealthServer(metricsPort);
	await healthServer.start();

	logger
		.withMetadata({
			port: metricsPort,
			endpoints: ['/health', '/ready', '/live', '/metrics'],
		})
		.info('Health and metrics server started successfully');

	return healthServer;
}

