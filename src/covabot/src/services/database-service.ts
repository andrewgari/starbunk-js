/**
 * SQLite database service for CovaBot v2
 * Handles connection management and schema migrations
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('DatabaseService');

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database.Database | null = null;
  private dbPath: string;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(dbPath?: string): DatabaseService {
    if (!DatabaseService.instance) {
      const resolvedPath = dbPath || DatabaseService.getDefaultDbPath();
      DatabaseService.instance = new DatabaseService(resolvedPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Get default database path
   */
  static getDefaultDbPath(): string {
    const packageRoot = path.resolve(__dirname, '../..');
    return path.join(packageRoot, 'data', 'covabot.sqlite');
  }

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    logger.withMetadata({ db_path: this.dbPath }).info('Initializing database');

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      logger.withMetadata({ dir: dataDir }).info('Creating data directory');
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      await this.runMigrations();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.withError(error).error('Failed to initialize database');
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Run database schema migrations
   */
  private async runMigrations(): Promise<void> {
    logger.info('Running database migrations');

    const db = this.getDb();

    // Create migrations tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Define migrations
    const migrations: { name: string; sql: string }[] = [
      {
        name: '001_initial_schema',
        sql: `
          -- Conversation history
          CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY,
            profile_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT,
            message_content TEXT NOT NULL,
            bot_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_conversations_profile_channel
            ON conversations(profile_id, channel_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_user
            ON conversations(profile_id, user_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_created
            ON conversations(created_at);

          -- Learned user facts
          CREATE TABLE IF NOT EXISTS user_facts (
            id INTEGER PRIMARY KEY,
            profile_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            fact_type TEXT NOT NULL,
            fact_key TEXT NOT NULL,
            fact_value TEXT NOT NULL,
            confidence REAL DEFAULT 1.0,
            learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(profile_id, user_id, fact_type, fact_key)
          );

          CREATE INDEX IF NOT EXISTS idx_user_facts_user
            ON user_facts(profile_id, user_id);

          -- Personality trait evolution
          CREATE TABLE IF NOT EXISTS personality_evolution (
            id INTEGER PRIMARY KEY,
            profile_id TEXT NOT NULL,
            trait_name TEXT NOT NULL,
            trait_value REAL NOT NULL,
            change_reason TEXT,
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(profile_id, trait_name)
          );

          -- Social battery state
          CREATE TABLE IF NOT EXISTS social_battery_state (
            profile_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_count INTEGER DEFAULT 0,
            window_start DATETIME,
            last_message_at DATETIME,
            PRIMARY KEY(profile_id, channel_id)
          );

          -- Keyword interests (replaces vector embeddings)
          CREATE TABLE IF NOT EXISTS keyword_interests (
            profile_id TEXT NOT NULL,
            keyword TEXT NOT NULL,
            category TEXT,
            weight REAL DEFAULT 1.0,
            PRIMARY KEY(profile_id, keyword)
          );
        `,
      },
    ];

    // Apply migrations
    const applied = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
    const appliedNames = new Set(applied.map(m => m.name));

    for (const migration of migrations) {
      if (!appliedNames.has(migration.name)) {
        logger.withMetadata({ migration: migration.name }).info('Applying migration');

        db.transaction(() => {
          db.exec(migration.sql);
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
        })();

        logger.withMetadata({ migration: migration.name }).info('Migration applied');
      }
    }

    logger.info('Migrations complete');
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.close();
      DatabaseService.instance = null;
    }
  }
}
