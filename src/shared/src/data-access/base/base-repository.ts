/**
 * BaseRepository - Base class for all data access repositories
 *
 * Provides common database operations with built-in observability tracing.
 * All repository classes should extend this base class to inherit tracing capabilities.
 */

import Database from 'better-sqlite3';
import { getTraceService } from '../../observability/trace-service';

export abstract class BaseRepository<_T> {
  protected db: Database.Database;
  protected tracing = getTraceService('data-access');

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Execute a query and return results with tracing
   */
  protected async query<R>(sql: string, params?: unknown[]): Promise<R[]> {
    const span = this.tracing.startSpan('db.query', {
      'db.system': 'sqlite',
      'db.statement': sql,
      'db.param_count': params?.length ?? 0,
    });

    try {
      // better-sqlite3 is synchronous, but we wrap in Promise for consistent API
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...(params || [])) as R[];

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
   * Execute a statement (INSERT, UPDATE, DELETE) with tracing
   */
  protected async execute(sql: string, params?: unknown[]): Promise<number> {
    const span = this.tracing.startSpan('db.execute', {
      'db.system': 'sqlite',
      'db.statement': sql,
      'db.param_count': params?.length ?? 0,
    });

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...(params || []));

      if (span) {
        span.setAttributes({ 'db.rows_affected': result.changes });
      }

      return result.changes;
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
   * Execute a statement and return the last insert ID with tracing
   */
  protected async executeWithId(sql: string, params?: unknown[]): Promise<number> {
    const span = this.tracing.startSpan('db.execute', {
      'db.system': 'sqlite',
      'db.statement': sql,
      'db.param_count': params?.length ?? 0,
    });

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...(params || []));

      if (span) {
        span.setAttributes({
          'db.rows_affected': result.changes,
          'db.last_insert_id': Number(result.lastInsertRowid),
        });
      }

      return Number(result.lastInsertRowid);
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
