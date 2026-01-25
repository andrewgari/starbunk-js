import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SocialBatteryService, SocialBatteryConfig } from '../../src/services/social-battery-service';
import { SocialBatteryRepository } from '../../src/repositories/social-battery-repository';

describe('SocialBatteryService', () => {
  let mockSocialBatteryRepo: Partial<SocialBatteryRepository>;
  let batteryService: SocialBatteryService;

  const defaultConfig: SocialBatteryConfig = {
    maxMessages: 5,
    windowMinutes: 10,
    cooldownSeconds: 30,
  };

  beforeEach(() => {
    mockSocialBatteryRepo = {
      getState: vi.fn().mockReturnValue(null),
      createState: vi.fn(),
      resetWindow: vi.fn(),
      incrementCount: vi.fn(),
      deleteState: vi.fn(),
      resetProfile: vi.fn(),
      getActivitySummary: vi.fn().mockReturnValue({
        totalChannels: 0,
        totalMessages: 0,
        activeChannels: 0,
      }),
    };

    batteryService = new SocialBatteryService(
      mockSocialBatteryRepo as SocialBatteryRepository,
    );
  });

  describe('canSpeak', () => {
    it('should allow speaking with no previous state', () => {
      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue(null);

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.reason).toBe('ok');
    });

    it('should allow speaking within rate limit', () => {
      vi.useFakeTimers();

      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue({
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 3,
        window_start: windowStart.toISOString(),
        last_message_at: new Date(now.getTime() - 35000).toISOString(), // 35 seconds ago
      });

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(3);
      expect(result.reason).toBe('ok');

      vi.useRealTimers();
    });

    it('should block when rate limited', () => {
      vi.useFakeTimers();

      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue({
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 5,
        window_start: windowStart.toISOString(),
        last_message_at: new Date(now.getTime() - 35000).toISOString(), // 35 seconds ago
      });

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(false);
      expect(result.currentCount).toBe(5);
      expect(result.reason).toBe('rate_limited');
      expect(result.windowResetSeconds).toBeDefined();

      vi.useRealTimers();
    });

    it('should block during cooldown', () => {
      const now = new Date();

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue({
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 1,
        window_start: now.toISOString(),
        last_message_at: new Date(now.getTime() - 10000).toISOString(), // 10 seconds ago
      });

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(false);
      expect(result.reason).toBe('cooldown');
    });

    it('should allow speaking after cooldown expires', async () => {
      const now = new Date();

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue({
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 1,
        window_start: now.toISOString(),
        last_message_at: new Date(now.getTime() - 31000).toISOString(), // 31 seconds ago
      });

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('should reset window after time expires', () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 11 * 60 * 1000); // 11 minutes ago

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue({
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 5,
        window_start: windowStart.toISOString(),
        last_message_at: new Date(now.getTime() - 35000).toISOString(), // 35 seconds ago
      });

      const result = batteryService.canSpeak('profile', 'channel-1', defaultConfig);

      expect(result.canSpeak).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });

  describe('recordMessage', () => {
    it('should create state on first message', () => {
      vi.useFakeTimers();
      const now = new Date();
      vi.setSystemTime(now);

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue(null);

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      expect(mockSocialBatteryRepo.createState).toHaveBeenCalledWith(
        'profile',
        'channel-1',
        now.toISOString(),
      );

      vi.useRealTimers();
    });

    it('should increment count on subsequent messages', () => {
      vi.useFakeTimers();
      const now = new Date();
      vi.setSystemTime(now);

      const existingState = {
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 1,
        window_start: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        last_message_at: new Date(now.getTime() - 35000).toISOString(),
      };

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue(existingState);

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      expect(mockSocialBatteryRepo.incrementCount).toHaveBeenCalledWith(
        'profile',
        'channel-1',
        now.toISOString(),
      );

      vi.useRealTimers();
    });

    it('should reset count when window expires', () => {
      vi.useFakeTimers();
      const now = new Date();
      vi.setSystemTime(now);

      const existingState = {
        profile_id: 'profile',
        channel_id: 'channel-1',
        message_count: 5,
        window_start: new Date(now.getTime() - 11 * 60 * 1000).toISOString(), // 11 minutes ago
        last_message_at: new Date(now.getTime() - 11 * 60 * 1000).toISOString(),
      };

      vi.mocked(mockSocialBatteryRepo.getState!).mockReturnValue(existingState);

      batteryService.recordMessage('profile', 'channel-1', defaultConfig);

      expect(mockSocialBatteryRepo.resetWindow).toHaveBeenCalledWith(
        'profile',
        'channel-1',
        now.toISOString(),
      );

      vi.useRealTimers();
    });
  });

  describe('resetChannel', () => {
    it('should clear channel state', () => {
      batteryService.resetChannel('profile', 'channel-1');

      expect(mockSocialBatteryRepo.deleteState).toHaveBeenCalledWith('profile', 'channel-1');
    });
  });

  describe('resetProfile', () => {
    it('should clear all states for a profile', () => {
      batteryService.resetProfile('profile');

      expect(mockSocialBatteryRepo.resetProfile).toHaveBeenCalledWith('profile');
    });
  });

  describe('getActivitySummary', () => {
    it('should return activity summary', () => {
      vi.mocked(mockSocialBatteryRepo.getActivitySummary!).mockReturnValue({
        totalChannels: 2,
        totalMessages: 3,
        activeChannels: 2,
      });

      const summary = batteryService.getActivitySummary('profile');

      expect(summary.totalChannels).toBe(2);
      expect(summary.totalMessages).toBe(3);
      expect(summary.activeChannels).toBe(2);
    });

    it('should handle empty profile', () => {
      vi.mocked(mockSocialBatteryRepo.getActivitySummary!).mockReturnValue({
        totalChannels: 0,
        totalMessages: 0,
        activeChannels: 0,
      });

      const summary = batteryService.getActivitySummary('non-existent');

      expect(summary.totalChannels).toBe(0);
      expect(summary.totalMessages === 0 || summary.totalMessages === null).toBe(true);
      expect(summary.activeChannels === 0 || summary.activeChannels === null).toBe(true);
    });
  });
});
