import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '@starbunk/shared';

interface HealthStatus {
	status: 'healthy' | 'unhealthy';
	timestamp: string;
	discord: {
		connected: boolean;
		initialized: boolean;
	};
	uptime: number;
	bots?: {
		loaded: number;
		active: number;
	};
}

export class HealthServer {
	private server?: any;
	private readonly port: number;
	
	constructor(port?: number) {
		this.port = port || parseInt(process.env.HEALTH_PORT || '3002');
	}

	start(getHealthStatus: () => HealthStatus): void {
		this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
			this.handleRequest(req, res, getHealthStatus);
		});

		this.server.listen(this.port, () => {
			logger.info(`Health server running on port ${this.port}`);
		});
	}

	stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					logger.info('Health server stopped');
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	private handleRequest(
		req: IncomingMessage, 
		res: ServerResponse, 
		getHealthStatus: () => HealthStatus
	): void {
		if (req.url === '/health') {
			this.handleHealthCheck(res, getHealthStatus);
		} else if (req.url === '/ready') {
			this.handleReadinessCheck(res, getHealthStatus);
		} else if (req.url === '/live') {
			this.handleLivenessCheck(res, getHealthStatus);
		} else {
			this.handleNotFound(res);
		}
	}

	private handleHealthCheck(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		const status = getHealthStatus();
		const statusCode = status.status === 'healthy' ? 200 : 503;

		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(status, null, 2));
	}

	private handleReadinessCheck(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		const status = getHealthStatus();
		const ready = status.discord.connected && status.discord.initialized;
		const statusCode = ready ? 200 : 503;

		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ ready, timestamp: status.timestamp }));
	}

	private handleLivenessCheck(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		const status = getHealthStatus();
		const alive = status.uptime > 0;
		const statusCode = alive ? 200 : 503;

		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ alive, uptime: status.uptime, timestamp: status.timestamp }));
	}

	private handleNotFound(res: ServerResponse): void {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found');
	}
}