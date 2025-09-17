import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { ProductionMetricsService } from './ProductionMetricsService';
import { performance } from 'perf_hooks';

interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy'; // eslint-disable-line @typescript-eslint/no-unused-vars
	checks: Array<{
		// eslint-disable-line @typescript-eslint/no-unused-vars
		name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		status: 'pass' | 'fail' | 'warn'; // eslint-disable-line @typescript-eslint/no-unused-vars
		output?: string;
		time?: string;
		duration_ms?: number;
	}>;
	timestamp: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	version?: string;
	uptime: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	environment?: string;
}

interface EndpointsConfig {
	port: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	host: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	basePath: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	enableMetrics: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	enableHealth: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	enablePprof: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	enableReady: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	corsEnabled: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	authToken?: string;
	timeout: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	maxRequestSize: number; // eslint-disable-line @typescript-eslint/no-unused-vars
}

type HealthCheckFunction = () => Promise<{
	name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	status: 'pass' | 'fail' | 'warn'; // eslint-disable-line @typescript-eslint/no-unused-vars
	output?: string;
	duration_ms?: number;
}>;

export class HttpEndpointsService {
	private server?: any;
	private readonly service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly config: EndpointsConfig; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly healthChecks = new Map<string, HealthCheckFunction>();
	private metricsService?: ProductionMetricsService;
	private isShuttingDown = false;
	private requestCount = 0;
	private readonly maxConcurrentRequests = 100;

	constructor(service: string, userConfig?: Partial<EndpointsConfig>) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.service = service;
		this.config = {
			port: parseInt(process.env.METRICS_PORT || process.env.HEALTH_PORT || '3000'), // eslint-disable-line @typescript-eslint/no-unused-vars
			host: process.env.METRICS_HOST || '0.0.0.0', // eslint-disable-line @typescript-eslint/no-unused-vars
			basePath: process.env.METRICS_BASE_PATH || '', // eslint-disable-line @typescript-eslint/no-unused-vars
			enableMetrics: process.env.ENABLE_METRICS_ENDPOINT !== 'false', // eslint-disable-line @typescript-eslint/no-unused-vars
			enableHealth: process.env.ENABLE_HEALTH_ENDPOINT !== 'false', // eslint-disable-line @typescript-eslint/no-unused-vars
			enablePprof: process.env.ENABLE_PPROF_ENDPOINT === 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
			enableReady: process.env.ENABLE_READINESS_ENDPOINT !== 'false', // eslint-disable-line @typescript-eslint/no-unused-vars
			corsEnabled: process.env.ENABLE_CORS === 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
			authToken: process.env.METRICS_AUTH_TOKEN, // eslint-disable-line @typescript-eslint/no-unused-vars
			timeout: parseInt(process.env.HTTP_TIMEOUT || '10000'), // eslint-disable-line @typescript-eslint/no-unused-vars
			maxRequestSize: parseInt(process.env.HTTP_MAX_REQUEST_SIZE || '1048576'), // 1MB // eslint-disable-line @typescript-eslint/no-unused-vars
			...userConfig,
		};
	}

	setMetricsService(metricsService: ProductionMetricsService): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.metricsService = metricsService;
	}

	addHealthCheck(name: string, checkFunction: HealthCheckFunction): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.healthChecks.set(name, checkFunction);
		logger.debug(`Added health check: ${name}`); // eslint-disable-line @typescript-eslint/no-unused-vars
	}

	removeHealthCheck(name: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.healthChecks.delete(name);
		logger.debug(`Removed health check: ${name}`); // eslint-disable-line @typescript-eslint/no-unused-vars
	}

	async start(): Promise<void> {
		if (this.server) {
			logger.warn('HTTP endpoints server already started');
			return;
		}

		try {
			this.server = createServer((req, res) => {
				this.handleRequest(req, res).catch((error) => {
					logger.error('Unhandled error in HTTP request:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
					this.sendErrorResponse(res, 500, 'Internal server error');
				});
			});

			// Set server timeout
			this.server.timeout = this.config.timeout;

			// Handle server errors
			this.server.on('error', (error: Error) => {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				logger.error('HTTP server error:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Handle client errors
			this.server.on('clientError', (error: Error) => {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				logger.debug('HTTP client error:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			await new Promise<void>((resolve, reject) => {
				this.server.listen(this.config.port, this.config.host, (error?: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			// Set up default health checks
			this.setupDefaultHealthChecks();

			logger.info(`HTTP endpoints server started`, {
				port: this.config.port, // eslint-disable-line @typescript-eslint/no-unused-vars
				host: this.config.host, // eslint-disable-line @typescript-eslint/no-unused-vars
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				endpoints: this.getAvailableEndpoints(), // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to start HTTP endpoints server:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const startTime = performance.now();
		const url = new URL(req.url || '/', `http://${req.headers.host}`); // eslint-disable-line @typescript-eslint/no-unused-vars
		const path = url.pathname;
		const method = req.method || 'GET';

		// Rate limiting check
		if (this.requestCount >= this.maxConcurrentRequests) {
			this.sendErrorResponse(res, 429, 'Too many concurrent requests');
			return;
		}

		this.requestCount++;

		try {
			// CORS handling
			if (this.config.corsEnabled) {
				this.setCorsHeaders(res);
				if (method === 'OPTIONS') {
					res.writeHead(204);
					res.end();
					return;
				}
			}

			// Authentication check
			if (this.config.authToken && !this.isAuthenticated(req)) {
				this.sendErrorResponse(res, 401, 'Unauthorized');
				return;
			}

			// Route requests
			const basePath = this.config.basePath;
			const routePath = path.replace(basePath, '').replace(/\/+/g, '/');

			let handled = false;

			// Metrics endpoint
			if (this.config.enableMetrics && routePath === '/metrics' && method === 'GET') {
				await this.handleMetrics(res);
				handled = true;
			}

			// Health endpoint
			else if (this.config.enableHealth && routePath === '/health' && method === 'GET') {
				await this.handleHealth(res);
				handled = true;
			}

			// Readiness endpoint
			else if (this.config.enableReady && routePath === '/ready' && method === 'GET') {
				await this.handleReadiness(res);
				handled = true;
			}

			// Liveness endpoint
			else if (this.config.enableReady && routePath === '/live' && method === 'GET') {
				await this.handleLiveness(res);
				handled = true;
			}

			// Metrics summary endpoint (JSON format for dashboards)
			else if (this.config.enableMetrics && routePath === '/metrics/summary' && method === 'GET') {
				await this.handleMetricsSummary(res);
				handled = true;
			}

			// Pprof endpoints (if enabled)
			else if (this.config.enablePprof && routePath.startsWith('/debug/pprof/') && method === 'GET') {
				await this.handlePprof(routePath, res);
				handled = true;
			}

			// Service info endpoint
			else if (routePath === '/info' && method === 'GET') {
				await this.handleServiceInfo(res);
				handled = true;
			}

			// 404 for unhandled routes
			if (!handled) {
				this.sendErrorResponse(res, 404, 'Not found', {
					available_endpoints: this.getAvailableEndpoints(), // eslint-disable-line @typescript-eslint/no-unused-vars
				});
			}
		} catch (error) {
			logger.error(`Error handling ${method} ${path}:`, ensureError(error));
			this.sendErrorResponse(res, 500, 'Internal server error');
		} finally {
			this.requestCount--;
			const duration = performance.now() - startTime;

			// Track HTTP metrics
			if (this.metricsService) {
				const statusCode = res.statusCode || 500;
				this.metricsService.trackHttpRequest(method, path, statusCode, duration);
			}

			logger.debug(`${method} ${path} - ${res.statusCode} (${duration.toFixed(2)}ms)`);
		}
	}

	private async handleMetrics(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			if (!this.metricsService) {
				this.sendErrorResponse(res, 503, 'Metrics service not available');
				return;
			}

			const metrics = await this.metricsService.getPrometheusMetrics();

			res.writeHead(200, {
				'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Expires: '0',
			});
			res.end(metrics);
		} catch (error) {
			logger.error('Error getting metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.sendErrorResponse(res, 500, 'Failed to get metrics');
		}
	}

	private async handleHealth(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const healthResult = await this.performHealthChecks();
			const statusCode = healthResult.status === 'healthy' ? 200 : healthResult.status === 'degraded' ? 200 : 503;

			res.writeHead(statusCode, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			});
			res.end(JSON.stringify(healthResult, null, 2));
		} catch (error) {
			logger.error('Error performing health checks:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.sendErrorResponse(res, 500, 'Health check failed');
		}
	}

	private async handleReadiness(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const healthResult = await this.performHealthChecks();
			const isReady =
				healthResult.status === 'healthy' &&
				!this.isShuttingDown &&
				healthResult.checks.every((check) => check.status !== 'fail');

			const statusCode = isReady ? 200 : 503;
			const _result = {
				status: isReady ? 'ready' : 'not_ready', // eslint-disable-line @typescript-eslint/no-unused-vars
				timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				shutting_down: this.isShuttingDown, // eslint-disable-line @typescript-eslint/no-unused-vars
				checks: healthResult.checks.filter((check) => check.status === 'fail'), // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			res.writeHead(statusCode, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			});
			res.end(JSON.stringify(result, null, 2));
		} catch (error) {
			logger.error('Error checking readiness:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.sendErrorResponse(res, 500, 'Readiness check failed');
		}
	}

	private async handleLiveness(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Liveness is simpler - just check if the process is responsive
		const _result = {
			status: this.isShuttingDown ? 'shutting_down' : 'alive', // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			uptime: process.uptime(), // eslint-disable-line @typescript-eslint/no-unused-vars
			pid: process.pid, // eslint-disable-line @typescript-eslint/no-unused-vars
		};

		const statusCode = this.isShuttingDown ? 503 : 200;

		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(result, null, 2));
	}

	private async handleMetricsSummary(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			if (!this.metricsService) {
				this.sendErrorResponse(res, 503, 'Metrics service not available');
				return;
			}

			const summary = this.metricsService.getMetricsSummary();

			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			});
			res.end(JSON.stringify(summary, null, 2));
		} catch (error) {
			logger.error('Error getting metrics summary:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.sendErrorResponse(res, 500, 'Failed to get metrics summary');
		}
	}

	private async handleServiceInfo(res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const info = {
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			version: process.env.APP_VERSION || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: process.env.NODE_ENV || 'development', // eslint-disable-line @typescript-eslint/no-unused-vars
			instance: process.env.INSTANCE_ID || process.pid.toString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			uptime: process.uptime(), // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			node_version: process.version, // eslint-disable-line @typescript-eslint/no-unused-vars
			platform: process.platform, // eslint-disable-line @typescript-eslint/no-unused-vars
			architecture: process.arch, // eslint-disable-line @typescript-eslint/no-unused-vars
			memory_usage: process.memoryUsage(), // eslint-disable-line @typescript-eslint/no-unused-vars
			available_endpoints: this.getAvailableEndpoints(), // eslint-disable-line @typescript-eslint/no-unused-vars
			config: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				metrics_enabled: this.config.enableMetrics, // eslint-disable-line @typescript-eslint/no-unused-vars
				health_enabled: this.config.enableHealth, // eslint-disable-line @typescript-eslint/no-unused-vars
				readiness_enabled: this.config.enableReady, // eslint-disable-line @typescript-eslint/no-unused-vars
				pprof_enabled: this.config.enablePprof, // eslint-disable-line @typescript-eslint/no-unused-vars
				cors_enabled: this.config.corsEnabled, // eslint-disable-line @typescript-eslint/no-unused-vars
				auth_required: !!this.config.authToken, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
		};

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(info, null, 2));
	}

	private async handlePprof(path: string, res: ServerResponse): Promise<void> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Basic pprof implementation for debugging
		// This is a simplified version - in production you might want more comprehensive profiling

		if (path.endsWith('/heap')) {
			const heapSnapshot = JSON.stringify(process.memoryUsage(), null, 2);
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(heapSnapshot);
		} else if (path.endsWith('/profile')) {
			// CPU profiling would require additional libraries
			this.sendErrorResponse(res, 501, 'CPU profiling not implemented');
		} else {
			this.sendErrorResponse(res, 404, 'Pprof endpoint not found');
		}
	}

	private async performHealthChecks(): Promise<HealthCheckResult> {
		const _startTime = performance.now();
		const checks = [];

		// Run all health checks in parallel with timeout
		const checkPromises = Array.from(this.healthChecks.entries()).map(async ([name, checkFunction]) => {
			const checkStart = performance.now();
			try {
				const _result = (await Promise.race([
					checkFunction(),
					new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000)),
				])) as any;

				return {
					name,
					status: result.status, // eslint-disable-line @typescript-eslint/no-unused-vars
					output: result.output, // eslint-disable-line @typescript-eslint/no-unused-vars
					time: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
					duration_ms: Math.round(performance.now() - checkStart), // eslint-disable-line @typescript-eslint/no-unused-vars
				};
			} catch (error) {
				return {
					name,
					status: 'fail' as const, // eslint-disable-line @typescript-eslint/no-unused-vars
					output: ensureError(error).message, // eslint-disable-line @typescript-eslint/no-unused-vars
					time: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
					duration_ms: Math.round(performance.now() - checkStart), // eslint-disable-line @typescript-eslint/no-unused-vars
				};
			}
		});

		checks.push(...(await Promise.all(checkPromises)));

		// Determine overall health status
		const hasFailures = checks.some((check) => check.status === 'fail');
		const hasWarnings = checks.some((check) => check.status === 'warn');

		let overallStatus: 'healthy' | 'degraded' | 'unhealthy'; // eslint-disable-line @typescript-eslint/no-unused-vars
		if (hasFailures) {
			overallStatus = 'unhealthy';
		} else if (hasWarnings) {
			overallStatus = 'degraded';
		} else {
			overallStatus = 'healthy';
		}

		return {
			status: overallStatus, // eslint-disable-line @typescript-eslint/no-unused-vars
			checks,
			timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			version: process.env.APP_VERSION, // eslint-disable-line @typescript-eslint/no-unused-vars
			uptime: process.uptime(), // eslint-disable-line @typescript-eslint/no-unused-vars
			environment: process.env.NODE_ENV, // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}

	private setupDefaultHealthChecks(): void {
		// Memory usage check
		this.addHealthCheck('memory', async () => {
			const memUsage = process.memoryUsage();
			const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
			const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
			const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

			let status: 'pass' | 'warn' | 'fail' = 'pass'; // eslint-disable-line @typescript-eslint/no-unused-vars
			if (heapUsagePercent > 90) {
				status = 'fail';
			} else if (heapUsagePercent > 80) {
				status = 'warn';
			}

			return {
				name: 'memory', // eslint-disable-line @typescript-eslint/no-unused-vars
				status,
				output: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`, // eslint-disable-line @typescript-eslint/no-unused-vars
			};
		});

		// Event loop lag check
		this.addHealthCheck('event_loop', async () => {
			const start = process.hrtime.bigint();
			await new Promise((resolve) => setImmediate(resolve));
			const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds

			let status: 'pass' | 'warn' | 'fail' = 'pass'; // eslint-disable-line @typescript-eslint/no-unused-vars
			if (lag > 100) {
				status = 'fail';
			} else if (lag > 50) {
				status = 'warn';
			}

			return {
				name: 'event_loop', // eslint-disable-line @typescript-eslint/no-unused-vars
				status,
				output: `Event loop lag: ${lag.toFixed(2)}ms`, // eslint-disable-line @typescript-eslint/no-unused-vars
			};
		});

		// Metrics service health (if available)
		if (this.metricsService) {
			this.addHealthCheck('metrics_service', async () => {
				const healthStatus = this.metricsService!.getHealthStatus() as any;
				const status =
					healthStatus.status === 'healthy'
						? 'pass'
						: healthStatus.status === 'shutting_down'
							? 'warn'
							: 'fail';

				return {
					name: 'metrics_service', // eslint-disable-line @typescript-eslint/no-unused-vars
					status,
					output: `Metrics service: ${healthStatus.status}, pending: ${healthStatus.pendingOperations}`, // eslint-disable-line @typescript-eslint/no-unused-vars
				};
			});
		}
	}

	private setCorsHeaders(res: ServerResponse): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		res.setHeader('Access-Control-Max-Age', '86400');
	}

	private isAuthenticated(req: IncomingMessage): boolean {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.authToken) return true;

		const authHeader = req.headers.authorization;
		if (!authHeader) return false;

		const token = authHeader.replace('Bearer ', '').replace('Token ', '');
		return token === this.config.authToken;
	}

	private sendErrorResponse(
		res: ServerResponse, // eslint-disable-line @typescript-eslint/no-unused-vars
		statusCode: number, // eslint-disable-line @typescript-eslint/no-unused-vars
		message: string, // eslint-disable-line @typescript-eslint/no-unused-vars
		details?: object,
	): void {
		const errorResponse = {
			error: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				code: statusCode, // eslint-disable-line @typescript-eslint/no-unused-vars
				message,
				timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				...details,
			},
		};

		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(errorResponse, null, 2));
	}

	private getAvailableEndpoints(): string[] {
		const endpoints = [];
		const basePath = this.config.basePath;

		if (this.config.enableMetrics) {
			endpoints.push(`${basePath}/metrics`);
			endpoints.push(`${basePath}/metrics/summary`);
		}
		if (this.config.enableHealth) {
			endpoints.push(`${basePath}/health`);
		}
		if (this.config.enableReady) {
			endpoints.push(`${basePath}/ready`);
			endpoints.push(`${basePath}/live`);
		}
		if (this.config.enablePprof) {
			endpoints.push(`${basePath}/debug/pprof/heap`);
			endpoints.push(`${basePath}/debug/pprof/profile`);
		}
		endpoints.push(`${basePath}/info`);

		return endpoints;
	}

	async stop(): Promise<void> {
		if (!this.server) {
			logger.warn('HTTP endpoints server not started');
			return;
		}

		logger.info('Stopping HTTP endpoints server...');
		this.isShuttingDown = true;

		try {
			// Wait for active requests to complete (with timeout)
			const maxWait = 10000; // 10 seconds
			const startTime = Date.now();

			while (this.requestCount > 0 && Date.now() - startTime < maxWait) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (this.requestCount > 0) {
				logger.warn(`Forcing server shutdown with ${this.requestCount} active requests`);
			}

			await new Promise<void>((resolve, reject) => {
				this.server.close((error?: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			this.server = undefined;
			this.healthChecks.clear();

			logger.info('HTTP endpoints server stopped');
		} catch (error) {
			logger.error('Error stopping HTTP endpoints server:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}

	getServerInfo(): object {
		return {
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			port: this.config.port, // eslint-disable-line @typescript-eslint/no-unused-vars
			host: this.config.host, // eslint-disable-line @typescript-eslint/no-unused-vars
			running: !!this.server, // eslint-disable-line @typescript-eslint/no-unused-vars
			shutting_down: this.isShuttingDown, // eslint-disable-line @typescript-eslint/no-unused-vars
			active_requests: this.requestCount, // eslint-disable-line @typescript-eslint/no-unused-vars
			health_checks: this.healthChecks.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			available_endpoints: this.getAvailableEndpoints(), // eslint-disable-line @typescript-eslint/no-unused-vars
			config: this.config, // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}
}

// Global instance management
let globalHttpEndpoints: HttpEndpointsService | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

export function initializeHttpEndpoints(
	service: string, // eslint-disable-line @typescript-eslint/no-unused-vars
	config?: Partial<EndpointsConfig>,
): HttpEndpointsService {
	if (globalHttpEndpoints) {
		logger.warn('HTTP endpoints service already initialized, returning existing instance');
		return globalHttpEndpoints;
	}

	globalHttpEndpoints = new HttpEndpointsService(service, config);
	logger.info(`HTTP endpoints service initialized for ${service}`);
	return globalHttpEndpoints;
}

export function getHttpEndpoints(): HttpEndpointsService {
	if (!globalHttpEndpoints) {
		throw new Error('HTTP endpoints service not initialized. Call initializeHttpEndpoints() first.');
	}
	return globalHttpEndpoints;
}

// Export types
export type { EndpointsConfig, HealthCheckFunction, HealthCheckResult };
