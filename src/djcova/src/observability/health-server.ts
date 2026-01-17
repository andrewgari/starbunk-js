import * as http from 'http';
import { getMetricsService } from '@/observability/metrics-service';

/**
 * Health and metrics HTTP server for BunkBot
 * Provides endpoints for Prometheus scraping and health checks
 */
export class HealthServer {
	private server: http.Server | null = null;
	private port: number;
	private startTime: number;

	constructor(port: number = 3000) {
		this.port = port;
		this.startTime = Date.now();
	}

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server = http.createServer((req, res) => {
				this.handleRequest(req, res);
			});

			this.server.on('error', (error) => {
				console.error('[HealthServer] Server error:', error);
				reject(error);
			});

			this.server.listen(this.port, () => {
				console.log(`[HealthServer] Listening on port ${this.port}`);
				resolve();
			});
		});
	}

	stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					console.log('[HealthServer] Server stopped');
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
		const url = req.url || '/';

		// Log request
		if (process.env.DEBUG_MODE === 'true') {
			console.log(`[HealthServer] ${req.method} ${url}`);
		}

		// Route handling
		if (url === '/metrics') {
			this.handleMetrics(req, res);
		} else if (url === '/health' || url === '/ready') {
			this.handleHealth(req, res);
		} else if (url === '/live') {
			this.handleLiveness(req, res);
		} else {
			this.handle404(req, res);
		}
	}

	private async handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
		try {
			const metrics = await getMetricsService().getMetrics();
			res.writeHead(200, {
				'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			});
			res.end(metrics);
		} catch (error) {
			console.error('[HealthServer] Error getting metrics:', error);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Failed to get metrics' }));
		}
	}

	private handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
		const uptime = Date.now() - this.startTime;
		const health = {
			status: 'healthy',
			uptime: uptime,
			timestamp: new Date().toISOString(),
			service: 'bunkbot',
		};

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(health));
	}

	private handleLiveness(req: http.IncomingMessage, res: http.ServerResponse): void {
		// Simple liveness check - just return OK if the process is running
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ status: 'alive' }));
	}

	private handle404(req: http.IncomingMessage, res: http.ServerResponse): void {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				error: 'Not Found',
				availableEndpoints: ['/metrics', '/health', '/ready', '/live'],
			}),
		);
	}
}

// Singleton instance
let healthServerInstance: HealthServer | undefined;

export function getHealthServer(port?: number): HealthServer {
	if (!healthServerInstance) {
		const serverPort = port || parseInt(process.env.METRICS_PORT || '3000', 10);
		healthServerInstance = new HealthServer(serverPort);
	}
	return healthServerInstance;
}

