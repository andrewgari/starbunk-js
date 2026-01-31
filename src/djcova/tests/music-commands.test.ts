/**
 * Music command functionality tests for DJCova
 * Tests all music commands with the new service-based architecture
 */

import { vi } from 'vitest';
import { ChatInputCommandInteraction, Guild } from 'discord.js';
import playCommand from '../src/commands/play';
import stopCommand from '../src/commands/stop';
import volumeCommand from '../src/commands/set-volume';

// Mock dependencies
vi.mock('../src/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withError: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../src/utils/discord-utils', () => ({
  sendErrorResponse: vi.fn(),
  sendSuccessResponse: vi.fn(),
}));

vi.mock('../src/utils', () => ({
  container: {
    get: vi.fn(),
    has: vi.fn(),
  },
  ServiceId: {
    DJCovaService: 'DJCovaService',
  },
}));

import { sendErrorResponse, sendSuccessResponse } from '../src/utils/discord-utils';

// Get mocked versions
const mockedSendErrorResponse = vi.mocked(sendErrorResponse);
const mockedSendSuccessResponse = vi.mocked(sendSuccessResponse);

describe('Music Commands Tests', () => {
  let mockInteraction: any;
  let mockService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock service
    mockService = {
      play: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn().mockReturnValue(50),
    };

    // Mock interaction
    mockInteraction = {
      guild: { id: 'guild-id' } as Guild,
      channelId: 'channel-id',
      options: {
        getString: vi.fn(),
        getInteger: vi.fn(),
      },
      reply: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
      deferReply: vi.fn().mockResolvedValue(undefined),
      replied: false,
      deferred: false,
    };

    // Setup container mock to return our service
    mockedContainer.has.mockImplementation(serviceId => {
      return serviceId === ServiceId.DJCovaService;
    });

    mockedContainer.get.mockImplementation(serviceId => {
      if (serviceId === ServiceId.DJCovaService) {
        return mockService;
      }
      return null;
    });

    // Setup response mocks
    mockedSendErrorResponse.mockResolvedValue(undefined as any);
    mockedSendSuccessResponse.mockResolvedValue(undefined as any);
  });

  describe('Play Command', () => {
    it('should successfully play a YouTube URL', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      mockInteraction.options!.getString = vi.fn().mockReturnValue(testUrl);

      await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockService.play).toHaveBeenCalledWith(mockInteraction, testUrl);
      expect(mockedSendSuccessResponse).toHaveBeenCalledWith(mockInteraction, '🎶 Now playing!');
    });

    it('should reject play command without URL', async () => {
      mockInteraction.options!.getString = vi.fn().mockReturnValue(null);

      await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Please provide a YouTube URL!',
      );
      expect(mockService.play).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=invalid';
      mockInteraction.options!.getString = vi.fn().mockReturnValue(testUrl);
      mockService.play.mockRejectedValue(new Error('Invalid URL'));

      await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Invalid URL');
    });

    it('should handle service not available', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=test';
      mockInteraction.options!.getString = vi.fn().mockReturnValue(testUrl);
      mockedContainer.get.mockReturnValue(null);

      await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Music service is not available.',
      );
    });
  });

  describe('Stop Command', () => {
    it('should successfully stop music and disconnect', async () => {
      await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockService.stop).toHaveBeenCalledWith(mockInteraction);
      expect(mockedSendSuccessResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Music stopped and disconnected!',
      );
    });

    it('should handle stop command without guild gracefully', async () => {
      mockInteraction.guild = null;

      await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockService.stop).toHaveBeenCalledWith(mockInteraction);
      expect(mockedSendSuccessResponse).toHaveBeenCalled();
    });

    it('should handle service errors during stop', async () => {
      mockService.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'An error occurred while stopping the music.',
      );
    });

    it('should handle service not available', async () => {
      mockedContainer.get.mockReturnValue(null);

      await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Music service is not available.',
      );
    });
  });

  describe('Volume Command', () => {
    it('should successfully set volume', async () => {
      const testVolume = 75;
      mockInteraction.options!.getInteger = vi.fn().mockReturnValue(testVolume);

      await volumeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockService.setVolume).toHaveBeenCalledWith(testVolume);
      expect(mockedSendSuccessResponse).toHaveBeenCalledWith(
        mockInteraction,
        `Volume set to ${testVolume}%`,
      );
    });

    // Note: "should reject volume command without value" test removed because
    // the volume parameter is required in the command definition, so this scenario cannot occur

    it('should handle service validation errors', async () => {
      const invalidVolume = 150;
      mockInteraction.options!.getInteger = vi.fn().mockReturnValue(invalidVolume);
      mockService.setVolume.mockImplementation(() => {
        throw new Error('Volume must be between 1 and 100');
      });

      await volumeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Volume must be between 1 and 100',
      );
    });

    it('should handle service errors', async () => {
      const testVolume = 50;
      mockInteraction.options!.getInteger = vi.fn().mockReturnValue(testVolume);
      mockService.setVolume.mockImplementation(() => {
        throw new Error('Volume change failed');
      });

      await volumeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(mockInteraction, 'Volume change failed');
    });

    it('should handle service not available', async () => {
      mockInteraction.options!.getInteger = vi.fn().mockReturnValue(50);
      mockedContainer.get.mockReturnValue(null);

      await volumeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockedSendErrorResponse).toHaveBeenCalledWith(
        mockInteraction,
        'Music service is not available.',
      );
    });
  });
});
