/**
 * Database initialization for CovaBot
 * Configures PostgreSQL connection with service-specific migrations
 */

import path from 'path';
import { PostgresService, type PostgresConfig } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('CovaBot:Database');

/**
 * Initialize PostgreSQL service for CovaBot
 */
export async function initializeDatabase(): Promise<PostgresService> {
  // Validate critical security requirement
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error(
      'POSTGRES_PASSWORD environment variable must be set. ' +
        'This is a critical security requirement and cannot default to an empty string.',
    );
  }

  const migrationsDir = path.join(__dirname, '../../migrations');

  // Verify migrations directory exists before initializing
  const fs = await import('fs');
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(
      'WARNING: Migrations directory does not exist at ' +
        migrationsDir +
        '. Database schema may not be initialized in production.',
    );
  }

  const config: PostgresConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'starbunk',
    user: process.env.POSTGRES_USER || 'starbunk',
    password: process.env.POSTGRES_PASSWORD,
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // CovaBot-specific migrations directory
    migrationsDir: migrationsDir,
  };

  logger
    .withMetadata({
      host: config.host,
      port: config.port,
      database: config.database,
    })
    .info('Initializing CovaBot PostgreSQL connection');

  const pgService = PostgresService.getInstance(config);
  await pgService.initialize();

  logger.info('PostgreSQL initialized successfully');

  return pgService;
}

/**
 * Get the initialized PostgreSQL service instance
 * Must call initializeDatabase() first
 */
export function getDatabase(): PostgresService {
  return PostgresService.getInstance();
}
