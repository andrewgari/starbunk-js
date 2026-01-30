/**
 * PostgreSQL database service for CovaBot conversation memory
 * Handles connection pooling, migrations, and query execution
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logLayer } from '../../observability/log-layer';

const logger = logLayer.withPrefix('PostgresService');

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // max connections in pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class PostgresService {
  private static instance: PostgresService | null = null;
  private pool: Pool | null = null;
  private config: PostgresConfig;

  private constructor(config: PostgresConfig) {
    this.config = config;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: PostgresConfig): PostgresService {
    if (!PostgresService.instance) {
      if (!config) {
        throw new Error('PostgresService not initialized. Provide config on first call.');
      }
      PostgresService.instance = new PostgresService(config);
    }
    return PostgresService.instance;
  }

  /**
   * Initialize the database connection pool and run migrations
   */
  async initialize(): Promise<void> {
    logger
      .withMetadata({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
      })
      .info('Initializing PostgreSQL connection pool');

    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.max || 20,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
      };

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      logger.info('PostgreSQL connection established');
      client.release();

      // Run migrations
      await this.runMigrations();

      logger.info('PostgreSQL initialized successfully');
    } catch (error) {
      logger.withError(error).error('Failed to initialize PostgreSQL');
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
    }
    return this.pool.connect();
  }

  /**
   * Execute a query with parameterized values
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      logger
        .withMetadata({
          query: text.substring(0, 100),
          rows: result.rowCount,
          duration_ms: duration,
        })
        .debug('Query executed');

      return result.rows as T[];
    } catch (error) {
      logger
        .withError(error)
        .withMetadata({ query: text.substring(0, 100) })
        .error('Query failed');
      throw error;
    }
  }

  /**
   * Execute a query and return the first row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute a query within a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.withError(error).error('Transaction rolled back');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('PostgreSQL connection pool closed');
    }
  }

  /**
   * Run database schema migrations from SQL files
   */
  private async runMigrations(): Promise<void> {
    logger.info('Running PostgreSQL migrations');

    // Get migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.warn('No migrations directory found, skipping migrations');
      return;
    }

    // Get all .sql files sorted by name
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      logger.info('No migration files found');
      return;
    }

    // Create migrations tracking table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check which migrations have been applied
    const appliedMigrations = await this.query<{ version: string }>(
      'SELECT version FROM schema_migrations',
    );
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    // Apply pending migrations
    for (const file of migrationFiles) {
      const version = path.basename(file, '.sql');

      if (appliedVersions.has(version)) {
        logger.withMetadata({ version }).debug('Migration already applied, skipping');
        continue;
      }

      logger.withMetadata({ version }).info('Applying migration');

      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await this.transaction(async client => {
          // Execute migration SQL
          await client.query(migrationSql);

          // Record migration as applied
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
            [version],
          );
        });

        logger.withMetadata({ version }).info('Migration applied successfully');
      } catch (error) {
        logger.withError(error).withMetadata({ version }).error('Migration failed');
        throw error;
      }
    }

    logger.info('All migrations completed');
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static async resetInstance(): Promise<void> {
    if (PostgresService.instance) {
      await PostgresService.instance.close();
      PostgresService.instance = null;
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.queryOne<{ now: Date }>('SELECT NOW() as now');
      return result !== null;
    } catch (error) {
      logger.withError(error).error('Health check failed');
      return false;
    }
  }
}
