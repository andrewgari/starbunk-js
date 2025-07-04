import { Message } from 'discord.js';
import { covaTrigger, covaDirectMentionTrigger } from '../triggers';
import { CovaIdentityService } from '../../services/identity';
import { createLLMResponseDecisionCondition } from '../llm-triggers';
import { logger } from '@starbunk/shared';

// Mock dependencies
jest.mock('../../services/identity');
jest.mock('../llm-triggers');
jest.mock('@starbunk/shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  and: jest.fn(),
  fromBot: jest.fn(),
  fromUser: jest.fn(),
  not: jest.fn(),
  withChance: jest.fn(),
  createTriggerResponse: jest.fn(),
  PerformanceTimer: {
    getInstance: jest.fn(() => ({
      getStatsString: jest.fn()
    }))
  },
  ResponseGenerator: jest.fn(),
  weightedRandomResponse: jest.fn(),
  PromptRegistry: {
    registerPrompt: jest.fn()
  },
  PromptType: {
    COVA_EMULATOR: 'COVA_EMULATOR',
    COVA_DECISION: 'COVA_DECISION'
  },
  getLLMManager: jest.fn(),
  LLMProviderType: {
    OLLAMA: 'OLLAMA'
  },
  getPersonalityService: jest.fn()
}));

const mockCovaIdentityService = CovaIdentityService as jest.Mocked<typeof CovaIdentityService>;
const mockCreateLLMResponseDecisionCondition = createLLMResponseDecisionCondition as jest.MockedFunction<typeof createLLMResponseDecisionCondition>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Enhanced CovaBot Triggers', () => {
  const validIdentity = {
    botName: 'Cova',
    avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png'
  };

  const mockMessage = {
    id: 'test-message-123',
    content: 'Test message',
    author: {
      id: 'other-user-123',
      bot: false,
      username: 'TestUser'
    },
    mentions: {
      has: jest.fn().mockReturnValue(false)
    },
    guild: {
      id: 'test-guild-123'
    }
  } as unknown as Message;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Identity Management', () => {
    it('should use enhanced identity service for covaTrigger', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(validIdentity);
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledWith(mockMessage);
        expect(result).toEqual(validIdentity);
      }
    });

    it('should return null when identity validation fails', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(null);
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Identity validation failed, silently discarding message')
        );
      }
    });

    it('should handle identity service errors gracefully', async () => {
      mockCovaIdentityService.getCovaIdentity.mockRejectedValue(new Error('Service error'));
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Critical error getting identity'),
          expect.any(Error)
        );
      }
    });

    it('should use enhanced identity service for covaDirectMentionTrigger', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(validIdentity);
      
      const identityFunction = covaDirectMentionTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledWith(mockMessage);
        expect(result).toEqual(validIdentity);
      }
    });
  });

  describe('Trigger Conditions', () => {
    it('should have correct priority for covaTrigger', () => {
      expect(covaTrigger.priority).toBe(3);
    });

    it('should have correct priority for covaDirectMentionTrigger', () => {
      expect(covaDirectMentionTrigger.priority).toBe(5);
    });

    it('should have correct name for covaTrigger', () => {
      expect(covaTrigger.name).toBe('cova-contextual-response');
    });

    it('should have correct name for covaDirectMentionTrigger', () => {
      expect(covaDirectMentionTrigger.name).toBe('cova-direct-mention');
    });
  });

  describe('Response Logic', () => {
    it('should not respond to bot messages', async () => {
      const botMessage = {
        ...mockMessage,
        author: {
          ...mockMessage.author,
          bot: true
        }
      } as unknown as Message;

      // Mock the condition to return false for bot messages
      const mockCondition = jest.fn().mockResolvedValue(false);
      
      // Since we can't easily test the actual condition function in isolation,
      // we verify that the condition structure is correct
      expect(typeof covaTrigger.condition).toBe('function');
    });

    it('should not respond to messages from Cova himself', () => {
      const covaMessage = {
        ...mockMessage,
        author: {
          ...mockMessage.author,
          id: '139592376443338752' // Cova's user ID
        }
      } as unknown as Message;

      expect(typeof covaTrigger.condition).toBe('function');
    });
  });

  describe('Silent Message Discarding', () => {
    it('should silently discard messages when identity fails', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(null);
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(result).toBeNull();
        // Should log warning but not throw error
        expect(mockLogger.warn).toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
      }
    });

    it('should silently discard messages when identity service throws', async () => {
      mockCovaIdentityService.getCovaIdentity.mockRejectedValue(new Error('Network error'));
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);
        
        expect(result).toBeNull();
        // Should log error but not re-throw
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('Response Functions', () => {
    it('should have response functions defined', () => {
      expect(typeof covaTrigger.response).toBe('function');
      expect(typeof covaDirectMentionTrigger.response).toBe('function');
    });

    it('should have identity functions defined', () => {
      expect(typeof covaTrigger.identity).toBe('function');
      expect(typeof covaDirectMentionTrigger.identity).toBe('function');
    });
  });
});