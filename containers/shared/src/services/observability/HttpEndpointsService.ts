import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { ProductionMetricsService } from './ProductionMetricsService';
import { performance } from 'perf_hooks';

interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
        name: string;
        status: 'pass' | 'fail' | 'warn';
        output?: string;
        time?: string;
        duration_ms?: number;
    }>;
    timestamp: string;
    service: string;
    version?: string;
    uptime: number;
    environment?: string;
}

interface EndpointsConfig {
    port: number;
    host: string;
    basePath: string;
    enableMetrics: boolean;
    enableHealth: boolean;
    enablePprof: boolean;
    enableReady: boolean;
    corsEnabled: boolean;
    authToken?: string;
    timeout: number;
    maxRequestSize: number;
}

type HealthCheckFunction = () => Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    output?: string;
    duration_ms?: number;
}>;

export class HttpEndpointsService {
    private server?: any;
    private readonly service: string;
    private readonly config: EndpointsConfig;
    private readonly healthChecks = new Map<string, HealthCheckFunction>();
    private metricsService?: ProductionMetricsService;
    private isShuttingDown = false;
    private requestCount = 0;
    private readonly maxConcurrentRequests = 100;

    constructor(service: string, userConfig?: Partial<EndpointsConfig>) {
        this.service = service;
        this.config = {
            port: parseInt(process.env.METRICS_PORT || process.env.HEALTH_PORT || '3000'),
            host: process.env.METRICS_HOST || '0.0.0.0',
            basePath: process.env.METRICS_BASE_PATH || '',
            enableMetrics: process.env.ENABLE_METRICS_ENDPOINT !== 'false',
            enableHealth: process.env.ENABLE_HEALTH_ENDPOINT !== 'false',
            enablePprof: process.env.ENABLE_PPROF_ENDPOINT === 'true',
            enableReady: process.env.ENABLE_READINESS_ENDPOINT !== 'false',
            corsEnabled: process.env.ENABLE_CORS === 'true',
            authToken: process.env.METRICS_AUTH_TOKEN,
            timeout: parseInt(process.env.HTTP_TIMEOUT || '10000'),
            maxRequestSize: parseInt(process.env.HTTP_MAX_REQUEST_SIZE || '1048576'), // 1MB
            ...userConfig
        };
    }

    setMetricsService(metricsService: ProductionMetricsService): void {
        this.metricsService = metricsService;
    }

    addHealthCheck(name: string, checkFunction: HealthCheckFunction): void {
        this.healthChecks.set(name, checkFunction);
        logger.debug(`Added health check: ${name}`);
    }

    removeHealthCheck(name: string): void {
        this.healthChecks.delete(name);
        logger.debug(`Removed health check: ${name}`);
    }

    async start(): Promise<void> {
        if (this.server) {
            logger.warn('HTTP endpoints server already started');
            return;
        }

        try {
            this.server = createServer((req, res) => {
                this.handleRequest(req, res).catch(error => {
                    logger.error('Unhandled error in HTTP request:', ensureError(error));
                    this.sendErrorResponse(res, 500, 'Internal server error');
                });
            });

            // Set server timeout
            this.server.timeout = this.config.timeout;

            // Handle server errors
            this.server.on('error', (error: Error) => {
                logger.error('HTTP server error:', ensureError(error));
            });

            // Handle client errors
            this.server.on('clientError', (error: Error) => {
                logger.debug('HTTP client error:', ensureError(error));
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
                port: this.config.port,
                host: this.config.host,
                service: this.service,
                endpoints: this.getAvailableEndpoints()
            });

        } catch (error) {
            logger.error('Failed to start HTTP endpoints server:', ensureError(error));
            throw error;
        }
    }

    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const startTime = performance.now();
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
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
                    available_endpoints: this.getAvailableEndpoints()
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
        try {
            if (!this.metricsService) {
                this.sendErrorResponse(res, 503, 'Metrics service not available');
                return;
            }

            const metrics = await this.metricsService.getPrometheusMetrics();
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Expires': '0'
            });
            res.end(metrics);

        } catch (error) {
            logger.error('Error getting metrics:', ensureError(error));
            this.sendErrorResponse(res, 500, 'Failed to get metrics');
        }
    }

    private async handleHealth(res: ServerResponse): Promise<void> {
        try {
            const healthResult = await this.performHealthChecks();
            const statusCode = healthResult.status === 'healthy' ? 200 :
                               healthResult.status === 'degraded' ? 200 : 503;

            res.writeHead(statusCode, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify(healthResult, null, 2));

        } catch (error) {
            logger.error('Error performing health checks:', ensureError(error));
            this.sendErrorResponse(res, 500, 'Health check failed');
        }
    }

    private async handleReadiness(res: ServerResponse): Promise<void> {
        try {
            const healthResult = await this.performHealthChecks();
            const isReady = healthResult.status === 'healthy' && 
                           !this.isShuttingDown &&
                           healthResult.checks.every(check => check.status !== 'fail');

            const statusCode = isReady ? 200 : 503;
            const result = {
                status: isReady ? 'ready' : 'not_ready',
                timestamp: new Date().toISOString(),
                service: this.service,
                shutting_down: this.isShuttingDown,
                checks: healthResult.checks.filter(check => check.status === 'fail')
            };

            res.writeHead(statusCode, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify(result, null, 2));

        } catch (error) {
            logger.error('Error checking readiness:', ensureError(error));
            this.sendErrorResponse(res, 500, 'Readiness check failed');
        }
    }

    private async handleLiveness(res: ServerResponse): Promise<void> {
        // Liveness is simpler - just check if the process is responsive
        const result = {
            status: this.isShuttingDown ? 'shutting_down' : 'alive',
            timestamp: new Date().toISOString(),
            service: this.service,
            uptime: process.uptime(),
            pid: process.pid
        };

        const statusCode = this.isShuttingDown ? 503 : 200;

        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify(result, null, 2));
    }

    private async handleMetricsSummary(res: ServerResponse): Promise<void> {
        try {
            if (!this.metricsService) {
                this.sendErrorResponse(res, 503, 'Metrics service not available');
                return;
            }

            const summary = this.metricsService.getMetricsSummary();

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify(summary, null, 2));

        } catch (error) {
            logger.error('Error getting metrics summary:', ensureError(error));
            this.sendErrorResponse(res, 500, 'Failed to get metrics summary');
        }
    }

    private async handleServiceInfo(res: ServerResponse): Promise<void> {
        const info = {
            service: this.service,
            version: process.env.APP_VERSION || 'unknown',
            environment: process.env.NODE_ENV || 'development',
            instance: process.env.INSTANCE_ID || process.pid.toString(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            node_version: process.version,
            platform: process.platform,
            architecture: process.arch,
            memory_usage: process.memoryUsage(),
            available_endpoints: this.getAvailableEndpoints(),
            config: {
                metrics_enabled: this.config.enableMetrics,
                health_enabled: this.config.enableHealth,
                readiness_enabled: this.config.enableReady,
                pprof_enabled: this.config.enablePprof,
                cors_enabled: this.config.corsEnabled,
                auth_required: !!this.config.authToken
            }
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify(info, null, 2));
    }

    private async handlePprof(path: string, res: ServerResponse): Promise<void> {
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
        const startTime = performance.now();
        const checks = [];

        // Run all health checks in parallel with timeout
        const checkPromises = Array.from(this.healthChecks.entries()).map(
            async ([name, checkFunction]) => {
                const checkStart = performance.now();
                try {
                    const result = await Promise.race([
                        checkFunction(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Health check timeout')), 5000)
                        )
                    ]) as any;

                    return {
                        name,
                        status: result.status,
                        output: result.output,
                        time: new Date().toISOString(),
                        duration_ms: Math.round(performance.now() - checkStart)
                    };
                } catch (error) {
                    return {
                        name,
                        status: 'fail' as const,
                        output: ensureError(error).message,
                        time: new Date().toISOString(),
                        duration_ms: Math.round(performance.now() - checkStart)
                    };
                }
            }
        );

        checks.push(...await Promise.all(checkPromises));

        // Determine overall health status
        const hasFailures = checks.some(check => check.status === 'fail');
        const hasWarnings = checks.some(check => check.status === 'warn');

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        if (hasFailures) {
            overallStatus = 'unhealthy';
        } else if (hasWarnings) {
            overallStatus = 'degraded';
        } else {
            overallStatus = 'healthy';
        }

        return {
            status: overallStatus,
            checks,
            timestamp: new Date().toISOString(),
            service: this.service,
            version: process.env.APP_VERSION,
            uptime: process.uptime(),
            environment: process.env.NODE_ENV
        };
    }

    private setupDefaultHealthChecks(): void {
        // Memory usage check
        this.addHealthCheck('memory', async () => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

            let status: 'pass' | 'warn' | 'fail' = 'pass';
            if (heapUsagePercent > 90) {
                status = 'fail';
            } else if (heapUsagePercent > 80) {
                status = 'warn';
            }

            return {
                name: 'memory',
                status,
                output: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`
            };
        });

        // Event loop lag check
        this.addHealthCheck('event_loop', async () => {
            const start = process.hrtime.bigint();
            await new Promise(resolve => setImmediate(resolve));
            const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds

            let status: 'pass' | 'warn' | 'fail' = 'pass';
            if (lag > 100) {
                status = 'fail';
            } else if (lag > 50) {
                status = 'warn';
            }

            return {
                name: 'event_loop',
                status,
                output: `Event loop lag: ${lag.toFixed(2)}ms`
            };
        });

        // Metrics service health (if available)
        if (this.metricsService) {
            this.addHealthCheck('metrics_service', async () => {
                const healthStatus = this.metricsService!.getHealthStatus() as any;
                const status = healthStatus.status === 'healthy' ? 'pass' :
                              healthStatus.status === 'shutting_down' ? 'warn' : 'fail';

                return {
                    name: 'metrics_service',
                    status,
                    output: `Metrics service: ${healthStatus.status}, pending: ${healthStatus.pendingOperations}`
                };
            });
        }
    }

    private setCorsHeaders(res: ServerResponse): void {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    private isAuthenticated(req: IncomingMessage): boolean {
        if (!this.config.authToken) return true;

        const authHeader = req.headers.authorization;
        if (!authHeader) return false;

        const token = authHeader.replace('Bearer ', '').replace('Token ', '');
        return token === this.config.authToken;
    }

    private sendErrorResponse(
        res: ServerResponse,
        statusCode: number,
        message: string,
        details?: object
    ): void {
        const errorResponse = {
            error: {
                code: statusCode,
                message,
                timestamp: new Date().toISOString(),
                service: this.service,
                ...details
            }
        };

        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
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

            while (this.requestCount > 0 && (Date.now() - startTime) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
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
            logger.error('Error stopping HTTP endpoints server:', ensureError(error));
            throw error;
        }
    }

    getServerInfo(): object {
        return {
            service: this.service,
            port: this.config.port,
            host: this.config.host,
            running: !!this.server,
            shutting_down: this.isShuttingDown,
            active_requests: this.requestCount,
            health_checks: this.healthChecks.size,
            available_endpoints: this.getAvailableEndpoints(),
            config: this.config
        };
    }
}

// Global instance management
let globalHttpEndpoints: HttpEndpointsService | undefined;

export function initializeHttpEndpoints(
    service: string,
    config?: Partial<EndpointsConfig>
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