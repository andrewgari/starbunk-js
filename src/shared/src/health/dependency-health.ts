import { registerHealthCheckModule } from '../observability/health-server';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('DependencyHealth');

/** Result of a single dependency ping */
interface DependencyResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  error?: string;
}

/** Options for registering dependency health checks */
export interface DependencyHealthOptions {
  /** Postgres connection config — omit to skip */
  postgres?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectTimeoutMillis?: number;
  };
  /** Redis URL (e.g. "redis://host:6379") — omit to skip */
  redisUrl?: string;
  /** Qdrant base URL (e.g. "http://host:6333") — omit to skip */
  qdrantUrl?: string;
}

async function pingPostgres(
  config: NonNullable<DependencyHealthOptions['postgres']>,
): Promise<DependencyResult> {
  const start = Date.now();
  let pool: import('pg').Pool | undefined;
  try {
    const { Pool } = await import('pg');
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: config.connectTimeoutMillis ?? 3000,
    });
    await pool.query('SELECT 1');
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'error', latency_ms: Date.now() - start, error: (err as Error).message };
  } finally {
    try {
      await pool?.end();
    } catch {
      /* ignore */
    }
  }
}

async function pingRedis(url: string): Promise<DependencyResult> {
  const start = Date.now();
  let client: import('ioredis').Redis | undefined;
  try {
    const { default: Redis } = await import('ioredis');
    client = new Redis(url, {
      connectTimeout: 3000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    await client.connect();
    await client.ping();
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'error', latency_ms: Date.now() - start, error: (err as Error).message };
  } finally {
    try {
      client?.disconnect();
    } catch {
      /* ignore */
    }
  }
}

async function pingQdrant(baseUrl: string): Promise<DependencyResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${baseUrl}/healthz`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return { status: 'error', latency_ms: Date.now() - start, error: `HTTP ${response.status}` };
    }
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'error', latency_ms: Date.now() - start, error: (err as Error).message };
  }
}

/**
 * Register a HealthCheckModule that pings configured external dependencies
 * (Postgres, Redis, Qdrant) and reports their status under /health.
 *
 * Only dependencies with options provided are checked. The module name is
 * `'dependencies'` and will replace any previously registered module with
 * that name.
 */
export function registerDependencyHealthChecks(options: DependencyHealthOptions): void {
  if (!options.postgres && !options.redisUrl && !options.qdrantUrl) {
    logger.warn('registerDependencyHealthChecks called with no dependencies configured — skipping');
    return;
  }

  registerHealthCheckModule({
    name: 'dependencies',
    getHealth: async () => {
      const results: Record<string, DependencyResult> = {};

      const checks: Promise<void>[] = [];

      if (options.postgres) {
        const pg = options.postgres;
        checks.push(
          pingPostgres(pg)
            .then(r => {
              results['postgres'] = r;
            })
            .catch(err => {
              results['postgres'] = { status: 'error', error: (err as Error).message };
            }),
        );
      }

      if (options.redisUrl) {
        const url = options.redisUrl;
        checks.push(
          pingRedis(url)
            .then(r => {
              results['redis'] = r;
            })
            .catch(err => {
              results['redis'] = { status: 'error', error: (err as Error).message };
            }),
        );
      }

      if (options.qdrantUrl) {
        const url = options.qdrantUrl;
        checks.push(
          pingQdrant(url)
            .then(r => {
              results['qdrant'] = r;
            })
            .catch(err => {
              results['qdrant'] = { status: 'error', error: (err as Error).message };
            }),
        );
      }

      await Promise.allSettled(checks);

      const anyError = Object.values(results).some(r => r.status === 'error');
      return {
        status: anyError ? 'error' : 'ok',
        dependencies: results,
      };
    },
  });

  const configured = [
    options.postgres ? 'postgres' : null,
    options.redisUrl ? 'redis' : null,
    options.qdrantUrl ? 'qdrant' : null,
  ].filter(Boolean);
  logger.withMetadata({ dependencies: configured }).info('Dependency health checks registered');
}
