import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SocialBatteryService, SocialBatteryConfig } from '../../src/services/social-battery-service';
import { DatabaseService } from '@starbunk/shared/database';
import * as fs from 'fs';
import * as path from 'path';

describe('SocialBatteryService', () => {
  const testDbPath = path.join(__dirname, '../../data/test-battery.sqlite');
  let db: Database.Database;
  let batteryService: SocialBatteryService;

  const defaultConfig: SocialBatteryConfig = {
    maxMessages: 5,
    windowMinutes: 10,
    cooldownSeconds: 30,
  };

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    DatabaseService.resetInstance();

    const dbService = DatabaseService.getInstance(testDbPath);
    await dbService.initialize();
    db = dbService.getDb();
    batteryService = new SocialBatteryService(db);
  });

  afterEach(() => {
    DatabaseService.resetInstance();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.useRealTimers();
  });

  describe('canSpeak', () => {
    it('should allow speaking with no previous state', () => {
      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.reason).toBe('ok');
    });

    it('should allow speaking within rate limit', () => {
      vi.useFakeTimers();

      // Record some messages but not at limit, with time gaps to avoid cooldown
      for (let i = 0; i < 3; i++) {
        batteryService.recordMessage('profile', 'channel-1', defaultConfig);
        vi.advanceTimersByTime(35000); // Wait past cooldown
      }

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(3);
      expect(result.reason).toBe('ok');
    });

    it('should block when rate limited', () => {
      vi.useFakeTimers();

      // Hit the rate limit, with time gaps to avoid cooldown
      for (let i = 0; i < 5; i++) {
        batteryService.recordMessage('profile', 'channel-1', defaultConfig);
        vi.advanceTimersByTime(35000); // Wait past cooldown between messages
      }

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(false);
      expect(result.currentCount).toBe(5);
      expect(result.reason).toBe('rate_limited');
      expect(result.windowResetSeconds).toBeDefined();
    });

    it('should block during cooldown', () => {
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      // Immediately check - should be in cooldown
      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(false);
      expect(result.reason).toBe('cooldown');
    });

    it('should allow speaking after cooldown expires', async () => {
      vi.useFakeTimers();

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      // Advance past cooldown
      vi.advanceTimersByTime(31000); // 31 seconds

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('should reset window after time expires', () => {
      vi.useFakeTimers();

      // Hit rate limit
      for (let i = 0; i < 5; i++) {
        batteryService.recordMessage('profile', 'channel-1', defaultConfig);
        vi.advanceTimersByTime(35000); // Wait past cooldown each time
      }

      // Advance past window
      vi.advanceTimersByTime(11 * 60 * 1000); // 11 minutes

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });

  describe('recordMessage', () => {
    it('should create state on first message', () => {
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      const state = batteryService.getState('profile', 'channel-1');

      expect(state).toBeDefined();
      expect(state?.message_count).toBe(1);
      expect(state?.window_start).toBeDefined();
      expect(state?.last_message_at).toBeDefined();
    });

    it('should increment count on subsequent messages', () => {
      vi.useFakeTimers();

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      vi.advanceTimersByTime(35000); // Wait past cooldown
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      const state = batteryService.getState('profile', 'channel-1');

      expect(state?.message_count).toBe(2);
    });

    it('should reset count when window expires', () => {
      vi.useFakeTimers();

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      vi.advanceTimersByTime(11 * 60 * 1000); // 11 minutes
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      const state = batteryService.getState('profile', 'channel-1');

      expect(state?.message_count).toBe(1); // Reset to 1 (this message)
    });
  });

  describe('resetChannel', () => {
    it('should clear channel state', () => {
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      batteryService.resetChannel('profile', 'channel-1');

      const state = batteryService.getState('profile', 'channel-1');

      expect(state).toBeNull();
    });
  });

  describe('resetProfile', () => {
    it('should clear all states for a profile', () => {
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      batteryService.recordMessage('profile', 'channel-2', defaultConfig);
      batteryService.resetProfile('profile');

      expect(batteryService.getState('profile', 'channel-1')).toBeNull();
      expect(batteryService.getState('profile', 'channel-2')).toBeNull();
    });
  });

  describe('getActivitySummary', () => {
    it('should return activity summary', () => {
      vi.useFakeTimers();

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      vi.advanceTimersByTime(35000);
      batteryService.recordMessage('profile', 'channel-1', defaultConfig);
      vi.advanceTimersByTime(35000);
      batteryService.recordMessage('profile', 'channel-2', defaultConfig);

      const summary = batteryService.getActivitySummary('profile');

      expect(summary.totalChannels).toBe(2);
      expect(summary.totalMessages).toBe(3);
      expect(summary.activeChannels).toBe(2); // Both had messages in last hour
    });

    it('should handle empty profile', () => {
      const summary = batteryService.getActivitySummary('non-existent');

      expect(summary.totalChannels).toBe(0);
      // totalMessages can be null or 0 when no records exist
      expect(summary.totalMessages === 0 || summary.totalMessages === null).toBe(true);
      // activeChannels can be null or 0 when no records exist
      expect(summary.activeChannels === 0 || summary.activeChannels === null).toBe(true);
    });
  });
});
