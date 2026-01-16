import { getHealthServer } from '@/observability/health-server';
import { logger } from '@/observability/logger';

/**
 * Initializes and starts the health and metrics server.
 * 
 * @returns The health server instance
 */
export async function initializeHealthServer() {
	const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);
	
	logger.info('Starting health and metrics server', { port: metricsPort });
	const healthServer = getHealthServer(metricsPort);
	await healthServer.start();
	
	logger.info('Health and metrics server started successfully', {
		port: metricsPort,
		endpoints: ['/health', '/ready', '/live', '/metrics'],
	});

	return healthServer;
}

