import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { logger, ensureError } from '@starbunk/shared';
import { getBotStorageStats } from '../core/bot-processor';

interface HealthStatus {
	status: 'healthy' | 'unhealthy' | 'degraded';
	timestamp: string;
	discord: {
		connected: boolean;
		initialized: boolean;
		latency?: number;
		guildCount?: number;
		lastHeartbeat?: number;
	};
	uptime: number;
	memory: {
		used: number;
		total: number;
		heapUsed: number;
		heapTotal: number;
		external: number;
	};
	metrics: {
		totalRequests: number;
		errorCount: number;
		errorRate: number;
		avgResponseTime: number;
		activeConnections: number;
	};
	bots?: {
		loaded: number;
		active: number;
		circuitBreakersOpen: number;
		storageSize: number;
	};
	dependencies: {
		discord: {
			status: 'healthy' | 'degraded' | 'unhealthy';
			latency: number;
			lastCheck: number;
		};
		storage: {
			status: 'healthy' | 'degraded' | 'unhealthy';
			size: number;
			oldestItem: number;
		};
	};
	configuration: {
		nodeEnv: string;
		debugMode: boolean;
		maxBotInstances: number;
		circuitBreakerEnabled: boolean;
	};
}

interface HealthMetrics {
	totalRequests: number;
	errorCount: number;
	responseTimes: number[];
	startTime: number;
	lastDiscordPing: number;
	lastErrorTime?: number;
}

export class HealthServer {
	private server?: Server;
	private readonly port: number;
	private metrics: HealthMetrics;
	private readonly maxResponseTimes = 100; // Keep last 100 response times

	constructor(port?: number) {
		this.port = port || parseInt(process.env.HEALTH_PORT || '3002');
		this.metrics = {
			totalRequests: 0,
			errorCount: 0,
			responseTimes: [],
			startTime: Date.now(),
			lastDiscordPing: 0,
		};
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

	private handleRequest(req: IncomingMessage, res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		const startTime = Date.now();
		this.metrics.totalRequests++;

		try {
			const pathname = this.getPathname(req.url || '');

			switch (pathname) {
				case '/health':
					this.handleHealthCheck(res, getHealthStatus);
					break;
				case '/ready':
					this.handleReadinessCheck(res, getHealthStatus);
					break;
				case '/live':
					this.handleLivenessCheck(res, getHealthStatus);
					break;
				case '/metrics':
					this.handleMetricsEndpoint(res, getHealthStatus);
					break;
				case '/status':
					this.handleDetailedStatus(res, getHealthStatus);
					break;
				default:
					this.handleNotFound(res);
			}
		} catch (error) {
			this.metrics.errorCount++;
			this.metrics.lastErrorTime = Date.now();
			logger.error('Health server request error:', ensureError(error));
			this.handleServerError(res);
		} finally {
			// Record response time
			const responseTime = Date.now() - startTime;
			this.recordResponseTime(responseTime);
		}
	}

	private getPathname(url: string): string {
		try {
			return new URL(url, 'http://localhost').pathname;
		} catch {
			// Fallback for malformed URLs
			return url.split('?')[0];
		}
	}

	private handleHealthCheck(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		try {
			const status = this.enhanceHealthStatus(getHealthStatus());
			const statusCode = this.getStatusCode(status.status);

			res.writeHead(statusCode, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Health-Check-Version': '2.0',
			});
			res.end(JSON.stringify(status, null, 2));
		} catch (error) {
			logger.error('Health check failed:', ensureError(error));
			this.handleServerError(res);
		}
	}

	private getStatusCode(status: string): number {
		switch (status) {
			case 'healthy':
				return 200;
			case 'degraded':
				return 200; // Still operational
			case 'unhealthy':
				return 503;
			default:
				return 503;
		}
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
		res.writeHead(404, {
			'Content-Type': 'application/json',
		});
		res.end(
			JSON.stringify({
				error: 'Not Found',
				message: 'Available endpoints: /health, /ready, /live, /metrics, /status',
				timestamp: new Date().toISOString(),
			}),
		);
	}

	private handleMetricsEndpoint(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		try {
			const status = this.enhanceHealthStatus(getHealthStatus());
			let prometheusMetrics = this.formatPrometheusMetrics(status);

			// Add observability metrics if available
			try {
				const { getMetrics } = require('@starbunk/shared');
				const metrics = getMetrics();
				const observabilityMetrics = metrics.getPrometheusMetrics();
				prometheusMetrics += '\n' + observabilityMetrics;
			} catch (error) {
				// Observability metrics not available - continue without them
				logger.debug('Observability metrics not available:', ensureError(error));
			}

			res.writeHead(200, {
				'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
			});
			res.end(prometheusMetrics);
		} catch (error) {
			logger.error('Metrics endpoint error:', ensureError(error));
			this.handleServerError(res);
		}
	}

	private handleDetailedStatus(res: ServerResponse, getHealthStatus: () => HealthStatus): void {
		try {
			const status = this.enhanceHealthStatus(getHealthStatus());

			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
			});
			res.end(
				JSON.stringify(
					{
						...status,
						server: {
							port: this.port,
							uptime: Date.now() - this.metrics.startTime,
							requestCount: this.metrics.totalRequests,
							errorCount: this.metrics.errorCount,
						},
					},
					null,
					2,
				),
			);
		} catch (error) {
			logger.error('Detailed status error:', ensureError(error));
			this.handleServerError(res);
		}
	}

	private handleServerError(res: ServerResponse): void {
		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					status: 'unhealthy',
					error: 'Internal server error',
					timestamp: new Date().toISOString(),
				}),
			);
		}
	}

	private enhanceHealthStatus(baseStatus: HealthStatus): HealthStatus {
		const memoryUsage = process.memoryUsage();
		const storageStats = getBotStorageStats();

		return {
			...baseStatus,
			memory: {
				used: memoryUsage.rss,
				total: memoryUsage.rss + memoryUsage.external,
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				external: memoryUsage.external,
			},
			metrics: {
				totalRequests: this.metrics.totalRequests,
				errorCount: this.metrics.errorCount,
				errorRate: this.calculateErrorRate(),
				avgResponseTime: this.calculateAvgResponseTime(),
				activeConnections: 1, // Simplified for HTTP server
			},
			dependencies: {
				discord: {
					status: baseStatus.discord.connected ? 'healthy' : 'unhealthy',
					latency: this.metrics.lastDiscordPing,
					lastCheck: Date.now(),
				},
				storage: {
					status: storageStats.size > 8000 ? 'degraded' : 'healthy',
					size: storageStats.size,
					oldestItem: storageStats.oldestItem,
				},
			},
			configuration: {
				nodeEnv: process.env.NODE_ENV || 'unknown',
				debugMode: process.env.DEBUG_MODE === 'true',
				maxBotInstances: parseInt(process.env.MAX_BOT_INSTANCES || '50'),
				circuitBreakerEnabled: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
			},
		};
	}

	private calculateErrorRate(): number {
		if (this.metrics.totalRequests === 0) return 0;
		return (this.metrics.errorCount / this.metrics.totalRequests) * 100;
	}

	private calculateAvgResponseTime(): number {
		if (this.metrics.responseTimes.length === 0) return 0;
		const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
		return Math.round(sum / this.metrics.responseTimes.length);
	}

	private recordResponseTime(time: number): void {
		this.metrics.responseTimes.push(time);

		// Keep only the last N response times to prevent memory growth
		if (this.metrics.responseTimes.length > this.maxResponseTimes) {
			this.metrics.responseTimes.shift();
		}
	}

	private formatPrometheusMetrics(status: HealthStatus): string {
		const lines = [];

		// Basic metrics
		lines.push(`# HELP bunkbot_health_status Health status of BunkBot (1=healthy, 0.5=degraded, 0=unhealthy)`);
		lines.push(`# TYPE bunkbot_health_status gauge`);
		const healthValue = status.status === 'healthy' ? 1 : status.status === 'degraded' ? 0.5 : 0;
		lines.push(`bunkbot_health_status ${healthValue}`);

		// Memory metrics
		lines.push(`# HELP bunkbot_memory_usage_bytes Memory usage in bytes`);
		lines.push(`# TYPE bunkbot_memory_usage_bytes gauge`);
		lines.push(`bunkbot_memory_usage_bytes{type="heap_used"} ${status.memory.heapUsed}`);
		lines.push(`bunkbot_memory_usage_bytes{type="heap_total"} ${status.memory.heapTotal}`);
		lines.push(`bunkbot_memory_usage_bytes{type="external"} ${status.memory.external}`);

		// Request metrics
		lines.push(`# HELP bunkbot_requests_total Total number of requests`);
		lines.push(`# TYPE bunkbot_requests_total counter`);
		lines.push(`bunkbot_requests_total ${status.metrics.totalRequests}`);

		lines.push(`# HELP bunkbot_errors_total Total number of errors`);
		lines.push(`# TYPE bunkbot_errors_total counter`);
		lines.push(`bunkbot_errors_total ${status.metrics.errorCount}`);

		lines.push(`# HELP bunkbot_response_time_milliseconds Average response time`);
		lines.push(`# TYPE bunkbot_response_time_milliseconds gauge`);
		lines.push(`bunkbot_response_time_milliseconds ${status.metrics.avgResponseTime}`);

		// Bot metrics
		if (status.bots) {
			lines.push(`# HELP bunkbot_loaded_bots Number of loaded bots`);
			lines.push(`# TYPE bunkbot_loaded_bots gauge`);
			lines.push(`bunkbot_loaded_bots ${status.bots.loaded}`);

			lines.push(`# HELP bunkbot_storage_size Bot storage size`);
			lines.push(`# TYPE bunkbot_storage_size gauge`);
			lines.push(`bunkbot_storage_size ${status.bots.storageSize || 0}`);
		}

		// Uptime
		lines.push(`# HELP bunkbot_uptime_seconds Uptime in seconds`);
		lines.push(`# TYPE bunkbot_uptime_seconds counter`);
		lines.push(`bunkbot_uptime_seconds ${Math.floor(status.uptime / 1000)}`);

		return lines.join('\n') + '\n';
	}
}
