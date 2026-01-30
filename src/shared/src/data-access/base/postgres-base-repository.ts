/**
 * PostgresBaseRepository - Base class for PostgreSQL data access repositories
 *
 * Provides common database operations with built-in observability tracing
 * for PostgreSQL-backed repositories. Uses parameterized queries for security.
 */

import { PoolClient } from 'pg';
import { getTraceService } from '../../observability/trace-service';
import { PostgresService } from '../../services/database/postgres-service';

export abstract class PostgresBaseRepository<_T> {
  protected pgService: PostgresService;
  protected tracing = getTraceService('data-access');

  constructor(pgService: PostgresService) {
    this.pgService = pgService;
  }

  /**
   * Execute a query and return results with tracing
   */
  protected async query<R>(sql: string, params?: unknown[]): Promise<R[]> {
    const span = this.tracing.startSpan('db.query', {
      'db.system': 'postgresql',
      'db.statement': sql.substring(0, 200), // truncate for logging
      'db.param_count': params?.length ?? 0,
    });

    try {
      const result = await this.pgService.query<R>(sql, params);

      if (span) {
        span.setAttributes({ 'db.record_count': result.length });
      }

      return result;
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Execute a query and return a single result
   */
  protected async queryOne<R>(sql: string, params?: unknown[]): Promise<R | null> {
    const results = await this.query<R>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE) with tracing
   */
  protected async execute(sql: string, params?: unknown[]): Promise<number> {
    const span = this.tracing.startSpan('db.execute', {
      'db.system': 'postgresql',
      'db.statement': sql.substring(0, 200),
      'db.param_count': params?.length ?? 0,
    });

    try {
      const client = await this.pgService.getClient();
      try {
        const result = await client.query(sql, params);

        if (span) {
          span.setAttributes({ 'db.rows_affected': result.rowCount ?? 0 });
        }

        return result.rowCount ?? 0;
      } finally {
        client.release();
      }
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Execute a statement and return the inserted row with RETURNING clause
   */
  protected async executeWithReturning<R>(sql: string, params?: unknown[]): Promise<R | null> {
    const span = this.tracing.startSpan('db.execute', {
      'db.system': 'postgresql',
      'db.statement': sql.substring(0, 200),
      'db.param_count': params?.length ?? 0,
    });

    try {
      const client = await this.pgService.getClient();
      try {
        const result = await client.query(sql, params);

        if (span) {
          span.setAttributes({
            'db.rows_affected': result.rowCount ?? 0,
            'db.has_returning': true,
          });
        }

        return result.rows.length > 0 ? (result.rows[0] as R) : null;
      } finally {
        client.release();
      }
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Execute operations within a transaction
   */
  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const span = this.tracing.startSpan('db.transaction', {
      'db.system': 'postgresql',
    });

    try {
      const result = await this.pgService.transaction(callback);
      return result;
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }
}
