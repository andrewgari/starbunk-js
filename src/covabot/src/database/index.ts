/**
 * Database initialization for CovaBot
 * Configures PostgreSQL connection with service-specific migrations
 */

import path from 'path';
import { PostgresService, type PostgresConfig } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('CovaBot:Database');

/**
 * Initialize PostgreSQL service for CovaBot, with retry on transient failures.
 * Retries up to MAX_RETRIES times with exponential backoff to handle:
 *   - Postgres container still starting up
 *   - Transient DNS resolution delays on Docker bridge networks
 */
export async function initializeDatabase(): Promise<PostgresService> {
  // Validate critical security requirement
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error(
      'POSTGRES_PASSWORD environment variable must be set. ' +
        'This is a critical security requirement and cannot default to an empty string.',
    );
  }

  const covabotMigrationsDir = path.join(__dirname, '../../migrations');
  // Include shared migrations (e.g., vector store schema) alongside CovaBot-specific ones
  const sharedMigrationsDir = path.resolve(__dirname, '../../../shared/migrations');

  // Verify migrations directory exists before initializing
  const fs = await import('fs');
  if (!fs.existsSync(covabotMigrationsDir)) {
    logger.warn(
      'WARNING: Migrations directory does not exist at ' +
        covabotMigrationsDir +
        '. Database schema may not be initialized in production.',
    );
  }

  const host = process.env.POSTGRES_HOST || 'localhost';
  const config: PostgresConfig = {
    host,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'starbunk',
    user: process.env.POSTGRES_USER || 'starbunk',
    password: process.env.POSTGRES_PASSWORD,
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // CovaBot-specific + shared migrations directories
    migrationsDir: [sharedMigrationsDir, covabotMigrationsDir],
  };

  logger
    .withMetadata({
      host: config.host,
      port: config.port,
      database: config.database,
    })
    .info('Initializing CovaBot PostgreSQL connection');

  const MAX_RETRIES = 10;
  const BASE_DELAY_MS = 3000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Reset singleton between retries so a fresh pool is created
      if (attempt > 1) {
        await PostgresService.resetInstance();
      }
      const pgService = PostgresService.getInstance(config);
      await pgService.initialize();
      logger.info('PostgreSQL initialized successfully');
      return pgService;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        logger
          .withMetadata({ attempt, max_retries: MAX_RETRIES, delay_ms: delay, error: message })
          .warn('PostgreSQL connection failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger
          .withMetadata({ attempt, max_retries: MAX_RETRIES, host, error: message })
          .error(
            'PostgreSQL connection failed after all retries. ' +
              'Verify POSTGRES_HOST is reachable and CovaBot is on the same Docker network as starbunk-postgres.',
          );
      }
    }
  }

  throw lastError;
}

/**
 * Get the initialized PostgreSQL service instance
 * Must call initializeDatabase() first
 */
export function getDatabase(): PostgresService {
  return PostgresService.getInstance();
}
