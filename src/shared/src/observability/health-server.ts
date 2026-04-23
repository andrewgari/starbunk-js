import * as http from 'http';
import { getMetricsService } from './metrics-service';
import { logLayer } from './log-layer';

const logger = logLayer.withPrefix('HealthServer');

type ApplicationHealthState = 'starting' | 'healthy' | 'unhealthy' | 'shutting_down';

interface ApplicationHealthInfo {
  state: ApplicationHealthState;
  reason?: string;
}

/**
 * Interface for health check modules that provide bot-specific health information.
 */
export interface HealthCheckModule {
  name: string;
  getHealth(): Promise<Record<string, unknown>>;
}

// Registry for health check modules — keyed by name so duplicates replace rather than accumulate
const healthCheckModules = new Map<string, HealthCheckModule>();

// Module-level health state — starts as 'starting' to prevent false positives during init.
// Containers must call setApplicationHealth('healthy') after successful startup.
let applicationHealth: ApplicationHealthInfo = { state: 'starting' };

/**
 * Update the application health state.
 * - `'healthy'`: call after successful startup; `/health` returns 200.
 * - `'unhealthy'`: call on startup failure or fatal runtime error; `/health` returns 503.
 * - `'shutting_down'`: call at the start of graceful shutdown; `/health` returns 503 so
 *   orchestrators stop routing traffic to this instance while it drains.
 * - `'starting'` is the initial default; `/health` returns 503 until the app signals ready.
 */
export function setApplicationHealth(state: ApplicationHealthState, reason?: string): void {
  applicationHealth = { state, reason };
}

/**
 * Register a health check module to be included in the /health endpoint response.
 * If a module with the same name is already registered it will be replaced,
 * keeping names unique and avoiding silent duplicate data in the response.
 * @param module The health check module to register.
 */
export function registerHealthCheckModule(module: HealthCheckModule): void {
  const existed = healthCheckModules.has(module.name);
  healthCheckModules.set(module.name, module);
  logger.info(`${existed ? 'Replaced' : 'Registered'} health check module: ${module.name}`);
}


/**
 * Health and metrics HTTP server
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

      this.server.on('error', error => {
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
    return new Promise(resolve => {
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
      logger.info(`[HealthServer] ${req.method} ${url}`);
    }

    // Route handling — async handlers are awaited so rejections are always caught
    if (url === '/metrics') {
      this.handleMetrics(req, res).catch(err => {
        logger.withError(err).error('[HealthServer] Unhandled error in /metrics handler');
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    } else if (url === '/health' || url === '/ready') {
      this.handleHealth(req, res).catch(err => {
        logger.withError(err).error('[HealthServer] Unhandled error in /health handler');
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
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
      logger.withError(error).error('[HealthServer] Error getting metrics');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get metrics' }));
    }
  }

  private async handleHealth(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const uptime = Date.now() - this.startTime;
    const serviceName = process.env.SERVICE_NAME || 'unknown';

    // Gather health from all registered modules, with a per-module timeout so a
    // slow or hung getHealth() cannot block the entire /health response.
    const MODULE_TIMEOUT_MS = 2000;
    const moduleHealths: Record<string, unknown> = {};
    const modulePromises = Array.from(healthCheckModules.values()).map(async module => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timed out after ${MODULE_TIMEOUT_MS}ms`)), MODULE_TIMEOUT_MS),
      );
      try {
        moduleHealths[module.name] = await Promise.race([module.getHealth(), timeout]);
      } catch (error) {
        logger.withError(error).warn(`Health check module '${module.name}' failed`);
        moduleHealths[module.name] = { status: 'error', error: (error as Error).message };
      }
    });
    await Promise.allSettled(modulePromises);

    const responseBody = {
      status: applicationHealth.state,
      reason: applicationHealth.reason,
      uptime,
      timestamp: new Date().toISOString(),
      service: serviceName,
      modules: moduleHealths,
    };

    if (applicationHealth.state === 'healthy') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
    } else {
      // starting, unhealthy, and shutting_down all return 503 so orchestrator
      // readiness probes fail and traffic is stopped / drained appropriately.
      res.writeHead(503, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify(responseBody));
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
