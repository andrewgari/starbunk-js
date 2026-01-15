import { createServer, Server } from 'http';
import { logger } from '@/observability/logger';

/**
 * Runs a lightweight health endpoint server for CI smoke testing
 * without requiring Discord login credentials.
 */
export function runSmokeTest(): void {
	const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 3000;

	const server: Server = createServer((req, res) => {
		if (req.url === '/health') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					status: 'healthy',
					service: 'bluebot',
					mode: 'smoke',
					timestamp: new Date().toISOString(),
				}),
			);
			return;
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found');
	});

	server.listen(port, () => {
		logger.info(`[SMOKE] BlueBot health server listening on port ${port}`);
	});

	const shutdown = (signal: string) => {
		logger.info(`[SMOKE] Received ${signal}, shutting down health server...`);
		server.close(() => process.exit(0));
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

