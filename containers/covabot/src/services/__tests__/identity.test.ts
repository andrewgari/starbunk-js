import { CovaIdentityService } from '../identity';
import { getBotIdentityFromDiscord } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';

// Mock dependencies
jest.mock('@starbunk/shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getBotIdentityFromDiscord: jest.fn()
}));

const mockGetBotIdentityFromDiscord = getBotIdentityFromDiscord as jest.MockedFunction<typeof getBotIdentityFromDiscord>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaIdentityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CovaIdentityService.clearCache();
  });

  describe('getCovaIdentity', () => {
    const validIdentity = {
      botName: 'Cova',
      avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
    };

    const mockMessage = {
      guild: { id: 'test-guild-123' }
    } as Message;

    it('should return valid identity when Discord API succeeds', async () => {
      mockGetBotIdentityFromDiscord.mockResolvedValue(validIdentity);

      const result = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result).toEqual(validIdentity);
      expect(mockGetBotIdentityFromDiscord).toHaveBeenCalledWith({
        userId: '139592376443338752',
        fallbackName: 'CovaBot',
        message: mockMessage,
        forceRefresh: true
      });
    });

    it('should return null when Discord API fails', async () => {
      mockGetBotIdentityFromDiscord.mockResolvedValue(null);

      const result = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve identity')
      );
    });

    it('should return null for invalid identity data', async () => {
      const invalidIdentity = {
        botName: '',
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(invalidIdentity);

      const result = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Identity validation failed')
      );
    });

    it('should return null for invalid avatar URL', async () => {
      const invalidIdentity = {
        botName: 'Cova',
        avatarUrl: 'https://example.com/invalid-url.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(invalidIdentity);

      const result = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result).toBeNull();
    });

    it('should cache valid identity results', async () => {
      mockGetBotIdentityFromDiscord.mockResolvedValue(validIdentity);

      // First call
      const result1 = await CovaIdentityService.getCovaIdentity(mockMessage);
      // Second call (should use cache)
      const result2 = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result1).toEqual(validIdentity);
      expect(result2).toEqual(validIdentity);
      expect(mockGetBotIdentityFromDiscord).toHaveBeenCalledTimes(1);
    });

    it('should respect forceRefresh parameter', async () => {
      mockGetBotIdentityFromDiscord.mockResolvedValue(validIdentity);

      // First call to populate cache
      await CovaIdentityService.getCovaIdentity(mockMessage);
      // Second call with forceRefresh
      await CovaIdentityService.getCovaIdentity(mockMessage, true);

      expect(mockGetBotIdentityFromDiscord).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      mockGetBotIdentityFromDiscord.mockRejectedValue(new Error('Discord API error'));

      const result = await CovaIdentityService.getCovaIdentity(mockMessage);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting Cova identity'),
        expect.any(Error)
      );
    });

    it('should cache different identities for different guilds', async () => {
      const guild1Message = { guild: { id: 'guild-1' } } as Message;
      const guild2Message = { guild: { id: 'guild-2' } } as Message;
      
      const identity1 = { ...validIdentity, botName: 'Cova-Guild1' };
      const identity2 = { ...validIdentity, botName: 'Cova-Guild2' };

      mockGetBotIdentityFromDiscord
        .mockResolvedValueOnce(identity1)
        .mockResolvedValueOnce(identity2);

      const result1 = await CovaIdentityService.getCovaIdentity(guild1Message);
      const result2 = await CovaIdentityService.getCovaIdentity(guild2Message);

      expect(result1).toEqual(identity1);
      expect(result2).toEqual(identity2);
      expect(mockGetBotIdentityFromDiscord).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateIdentity', () => {
    it('should validate correct identity data', async () => {
      const validIdentity = {
        botName: 'Cova',
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(validIdentity);

      const result = await CovaIdentityService.getCovaIdentity();
      expect(result).toEqual(validIdentity);
    });

    it('should reject empty botName', async () => {
      const invalidIdentity = {
        botName: '',
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(invalidIdentity);

      const result = await CovaIdentityService.getCovaIdentity();
      expect(result).toBeNull();
    });

    it('should reject empty avatarUrl', async () => {
      const invalidIdentity = {
        botName: 'Cova',
        avatarUrl: ''
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(invalidIdentity);

      const result = await CovaIdentityService.getCovaIdentity();
      expect(result).toBeNull();
    });

    it('should reject non-Discord avatar URLs', async () => {
      const invalidIdentity = {
        botName: 'Cova',
        avatarUrl: 'https://example.com/avatar.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(invalidIdentity);

      const result = await CovaIdentityService.getCovaIdentity();
      expect(result).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clear cache correctly', () => {
      CovaIdentityService.clearCache();
      const stats = CovaIdentityService.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should report cache statistics', async () => {
      const validIdentity = {
        botName: 'Cova',
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
      };
      mockGetBotIdentityFromDiscord.mockResolvedValue(validIdentity);

      await CovaIdentityService.getCovaIdentity({ guild: { id: 'test-guild' } } as Message);
      
      const stats = CovaIdentityService.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.keys).toContain('test-guild');
    });
  });
});