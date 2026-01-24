import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '@starbunk/shared/database';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseService', () => {
  const testDbPath = path.join(__dirname, '../../data/test-db.sqlite');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    DatabaseService.resetInstance();
  });

  afterEach(() => {
    DatabaseService.resetInstance();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create database and run migrations', async () => {
    const service = DatabaseService.getInstance(testDbPath);
    await service.initialize();

    expect(fs.existsSync(testDbPath)).toBe(true);

    const db = service.getDb();

    // Check that tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('user_facts');
    expect(tableNames).toContain('personality_evolution');
    expect(tableNames).toContain('social_battery_state');
    expect(tableNames).toContain('keyword_interests');
    expect(tableNames).toContain('migrations');
  });

  it('should only run migrations once', async () => {
    const service = DatabaseService.getInstance(testDbPath);
    await service.initialize();

    const db = service.getDb();

    // Check migration was recorded
    const migrations = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
    expect(migrations.length).toBeGreaterThan(0);

    // Re-initialize (should not fail or duplicate migrations)
    service.close();
    DatabaseService.resetInstance();

    const service2 = DatabaseService.getInstance(testDbPath);
    await service2.initialize();

    const db2 = service2.getDb();
    const migrations2 = db2.prepare('SELECT name FROM migrations').all() as { name: string }[];

    expect(migrations2.length).toBe(migrations.length);
  });

  it('should throw error when getDb called before initialize', () => {
    const service = DatabaseService.getInstance(testDbPath);
    expect(() => service.getDb()).toThrow('Database not initialized');
  });

  it('should create data directory if it does not exist', async () => {
    const deepPath = path.join(__dirname, '../../data/deep/nested/test.sqlite');
    const service = DatabaseService.getInstance(deepPath);
    await service.initialize();

    expect(fs.existsSync(deepPath)).toBe(true);

    // Clean up
    service.close();
    fs.unlinkSync(deepPath);
    fs.rmdirSync(path.dirname(deepPath));
    fs.rmdirSync(path.dirname(path.dirname(deepPath)));
  });
});
