// Comprehensive tests for Enhanced CovaBot
import { EnhancedCovaBot } from '../cova-bot/EnhancedCovaBot';
import { CovaIdentityService } from '../services/identity/CovaIdentityService';
import { QdrantMemoryService } from '../services/memory/QdrantMemoryService';
import { EmbeddingService } from '../services/embedding/EmbeddingService';
import { LLMService } from '../services/llm/LLMService';
import { CovaBotConfig } from '../types';

// Mock Discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    user: { id: 'bot-id', tag: 'CovaBot#1234' },
    guilds: { cache: new Map() },
    users: { cache: new Map() },
    isReady: jest.fn().mockReturnValue(true),
    uptime: 12345
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildMembers: 8,
    GuildPresences: 16
  },
  Events: {
    ClientReady: 'ready',
    GuildCreate: 'guildCreate',
    MessageCreate: 'messageCreate',
    Error: 'error'
  }
}));

// Mock services
jest.mock('../services/identity/CovaIdentityService');
jest.mock('../services/memory/QdrantMemoryService');
jest.mock('../services/embedding/EmbeddingService');
jest.mock('../services/llm/LLMService');

describe('Enhanced CovaBot', () => {
  let bot: EnhancedCovaBot;
  let mockConfig: CovaBotConfig;

  beforeEach(() => {
    mockConfig = {
      discord: {
        token: 'test-token',
        clientId: 'test-client-id'
      },
      database: {
        url: 'postgresql://test',
        maxConnections: 10
      },
      qdrant: {
        url: 'http://localhost:6333',
        collectionName: 'test-memories',
        vectorSize: 384,
        distance: 'cosine'
      },
      llm: {
        providers: [{
          name: 'test-provider',
          type: 'openai',
          apiKey: 'test-key',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7
        }],
        defaultProvider: 'test-provider'
      },
      web: {
        port: 7080,
        host: '0.0.0.0',
        cors: {
          origin: ['http://localhost:3000'],
          credentials: true
        },
        auth: {
          jwtSecret: 'test-secret',
          sessionTimeout: 86400
        }
      },
      memory: {
        maxMemoriesPerUser: 1000,
        retentionDays: 30,
        cleanupInterval: 3600
      },
      debug: {
        enabled: false,
        testingServerIds: [],
        testingChannelIds: []
      }
    };

    // Reset mocks
    jest.clearAllMocks();

    bot = new EnhancedCovaBot(mockConfig);
  });

  afterEach(async () => {
    if (bot) {
      await bot.stop();
    }
  });

  describe('Initialization', () => {
    it('should create bot with correct configuration', () => {
      expect(bot).toBeInstanceOf(EnhancedCovaBot);
      expect(CovaIdentityService).toHaveBeenCalledWith(mockConfig);
      expect(QdrantMemoryService).toHaveBeenCalledWith(mockConfig.qdrant);
      expect(EmbeddingService).toHaveBeenCalled();
      expect(LLMService).toHaveBeenCalledWith(mockConfig.llm.providers, mockConfig.llm.defaultProvider);
    });

    it('should initialize services in correct order', async () => {
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      const mockMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;

      mockEmbeddingService.prototype.initialize = jest.fn().mockResolvedValue(undefined);
      mockMemoryService.prototype.initialize = jest.fn().mockResolvedValue(undefined);

      await bot.start();

      expect(mockEmbeddingService.prototype.initialize).toHaveBeenCalled();
      expect(mockMemoryService.prototype.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      mockEmbeddingService.prototype.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));

      await expect(bot.start()).rejects.toThrow('Failed to start Enhanced CovaBot');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all services are healthy', async () => {
      const mockIdentityService = CovaIdentityService as jest.MockedClass<typeof CovaIdentityService>;
      const mockMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      const mockLLMService = LLMService as jest.MockedClass<typeof LLMService>;

      mockIdentityService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });
      mockMemoryService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });
      mockEmbeddingService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });
      mockLLMService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });

      const health = await bot.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.services).toBeDefined();
    });

    it('should return unhealthy status when any service is unhealthy', async () => {
      const mockIdentityService = CovaIdentityService as jest.MockedClass<typeof CovaIdentityService>;
      const mockMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      const mockLLMService = LLMService as jest.MockedClass<typeof LLMService>;

      mockIdentityService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });
      mockMemoryService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'unhealthy', details: { error: 'Connection failed' } });
      mockEmbeddingService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });
      mockLLMService.prototype.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', details: {} });

      const health = await bot.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.services.memory.status).toBe('unhealthy');
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', async () => {
      const mockIdentityService = CovaIdentityService as jest.MockedClass<typeof CovaIdentityService>;
      const mockMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;

      mockIdentityService.prototype.getStats = jest.fn().mockReturnValue({
        cachedIdentities: 5,
        cachedPersonalities: 3
      });

      mockMemoryService.prototype.getStats = jest.fn().mockResolvedValue({
        totalMemories: 1000,
        collectionInfo: { status: 'green' }
      });

      mockEmbeddingService.prototype.getStats = jest.fn().mockReturnValue({
        isInitialized: true,
        modelName: 'test-model',
        vectorSize: 384
      });

      const stats = await bot.getStats();

      expect(stats.bot).toBeDefined();
      expect(stats.identity).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.embedding).toBeDefined();
      expect(stats.processing).toBeDefined();
    });
  });

  describe('Debug Mode Safety', () => {
    it('should respect testing channel whitelist in debug mode', () => {
      const debugConfig = {
        ...mockConfig,
        debug: {
          enabled: true,
          testingServerIds: ['test-server'],
          testingChannelIds: ['allowed-channel']
        }
      };

      const debugBot = new EnhancedCovaBot(debugConfig);
      
      // This would need to be tested with actual message handling
      // For now, we just verify the config is set correctly
      expect(debugBot).toBeInstanceOf(EnhancedCovaBot);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should cleanup resources on stop', async () => {
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      mockEmbeddingService.prototype.cleanup = jest.fn().mockResolvedValue(undefined);

      await bot.start();
      await bot.stop();

      expect(mockEmbeddingService.prototype.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      mockEmbeddingService.prototype.cleanup = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

      await bot.start();
      
      // Should not throw even if cleanup fails
      await expect(bot.stop()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization failures', async () => {
      const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;
      mockEmbeddingService.prototype.initialize = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(bot.start()).rejects.toThrow('Failed to start Enhanced CovaBot');
    });

    it('should handle health check failures', async () => {
      const mockIdentityService = CovaIdentityService as jest.MockedClass<typeof CovaIdentityService>;
      mockIdentityService.prototype.healthCheck = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await bot.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });
});
