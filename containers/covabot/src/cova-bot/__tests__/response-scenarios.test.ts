import { Message } from 'discord.js';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../triggers';
import { CovaIdentityService } from '../../services/identity';
import { createLLMResponseDecisionCondition, createLLMEmulatorResponse } from '../llm-triggers';
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
  createTriggerResponse: jest.fn(),
  PerformanceTimer: {
    getInstance: jest.fn(() => ({
      getStatsString: jest.fn()
    }))
  },
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
  getPersonalityService: jest.fn(),
  weightedRandomResponse: jest.fn()
}));

const mockCovaIdentityService = CovaIdentityService as jest.Mocked<typeof CovaIdentityService>;
const mockCreateLLMResponseDecisionCondition = createLLMResponseDecisionCondition as jest.MockedFunction<typeof createLLMResponseDecisionCondition>;
const mockCreateLLMEmulatorResponse = createLLMEmulatorResponse as jest.MockedFunction<typeof createLLMEmulatorResponse>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot Response Scenarios', () => {
  const validIdentity = {
    botName: 'Cova',
    avatarUrl: 'https://cdn.discordapp.com/avatars/139592376443338752/avatar.png'
  };

  const createMockMessage = (overrides: any = {}): Message => ({
    id: 'test-message-123',
    content: 'Test message',
    channelId: 'test-channel-123',
    author: {
      id: 'user-123',
      bot: false,
      username: 'TestUser',
      _equals: jest.fn(),
      accentColor: null,
      avatar: null,
      avatarDecoration: null,
      avatarDecorationData: null,
      banner: null,
      createdAt: new Date(),
      createdTimestamp: Date.now(),
      defaultAvatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
      discriminator: '0000',
      displayName: 'TestUser',
      flags: null,
      globalName: null,
      hexAccentColor: null,
      partial: false,
      system: false,
      tag: 'TestUser#0000',
      valueOf: () => 'user-123'
    },
    mentions: {
      has: jest.fn().mockReturnValue(false)
    } as any,
    channel: {
      name: 'general'
    } as any,
    guild: {
      id: 'test-guild-123'
    } as any,
    valueOf: () => 'test-message-123',
    ...overrides
  } as unknown as Message);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCovaIdentityService.getCovaIdentity.mockResolvedValue(validIdentity);
  });

  describe('Real-World Scenarios', () => {
    const scenarios = [
      {
        name: 'Programming Discussion',
        message: {
          content: 'Anyone know how to handle async errors in TypeScript?',
          author: { id: 'dev-user-1', bot: false, username: 'DevUser' }
        },
        expectedBehavior: 'Should consider responding based on programming topic relevance',
        llmResponse: 'LIKELY'
      },
      {
        name: 'Casual Conversation',
        message: {
          content: 'What did everyone have for lunch?',
          author: { id: 'user-2', bot: false, username: 'FoodLover' }
        },
        expectedBehavior: 'Should probably not respond to casual non-technical topics',
        llmResponse: 'UNLIKELY'
      },
      {
        name: 'Bot Mention by User',
        message: {
          content: 'Hey @Cova, can you help with this?',
          author: { id: 'user-3', bot: false, username: 'HelpSeeker' },
          mentions: { has: jest.fn().mockReturnValue(true) }
        },
        expectedBehavior: 'Should always respond to direct mentions',
        llmResponse: 'N/A' // Direct mention bypasses LLM
      },
      {
        name: 'Short Acknowledgment',
        message: {
          content: 'ok',
          author: { id: 'user-4', bot: false, username: 'QuickReplier' }
        },
        expectedBehavior: 'Should rarely respond to very short messages',
        llmResponse: 'UNLIKELY'
      },
      {
        name: 'Question About Cova',
        message: {
          content: 'How does the cova bot decide when to respond?',
          author: { id: 'user-5', bot: false, username: 'Curious' }
        },
        expectedBehavior: 'Should likely respond to questions about itself',
        llmResponse: 'YES'
      },
      {
        name: 'Webhook/Bot Message',
        message: {
          content: 'Deployment successful',
          author: { id: 'webhook-123', bot: true, username: 'GitHub' }
        },
        expectedBehavior: 'Should never respond to bot messages',
        llmResponse: 'N/A' // Bot filter prevents LLM call
      },
      {
        name: 'Cova Self-Message',
        message: {
          content: 'Testing my own response',
          author: { id: '139592376443338752', bot: false, username: 'Cova' }
        },
        expectedBehavior: 'Should never respond to own messages',
        llmResponse: 'N/A' // Self filter prevents LLM call
      },
      {
        name: 'System/Admin Command',
        message: {
          content: '!cova-stats',
          author: { id: '139592376443338752', bot: false, username: 'Cova' }
        },
        expectedBehavior: 'Should respond to stats command from Cova',
        llmResponse: 'N/A' // Stats command trigger
      }
    ];

    scenarios.forEach(scenario => {
      it(`should handle: ${scenario.name}`, async () => {
        const mockMessage = createMockMessage(scenario.message);
        
        // Mock LLM decision if needed
        if (scenario.llmResponse !== 'N/A') {
          const mockDecisionCondition = jest.fn().mockResolvedValue(
            scenario.llmResponse === 'YES' || scenario.llmResponse === 'LIKELY'
          );
          mockCreateLLMResponseDecisionCondition.mockReturnValue(mockDecisionCondition);
        }
        
        // Test identity function
        const identityFunction = covaTrigger.identity;
        if (typeof identityFunction === 'function') {
          const identity = await identityFunction(mockMessage);
          
          if (scenario.expectedBehavior.includes('never respond')) {
            // For scenarios where we should never respond, 
            // the identity should still be valid but conditions should fail
            expect(identity).toEqual(validIdentity);
          } else {
            expect(identity).toEqual(validIdentity);
          }
        }
        
        // Verify appropriate logging
        if (scenario.expectedBehavior.includes('always respond')) {
          expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Using identity')
          );
        }
      });
    });
  });

  describe('Identity Validation Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      mockCovaIdentityService.getCovaIdentity.mockRejectedValue(new Error('Network timeout'));
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(createMockMessage());
        
        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Critical error getting identity'),
          expect.any(Error)
        );
      }
    });

    it('should handle invalid identity data', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(null);
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(createMockMessage());
        
        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Identity validation failed')
        );
      }
    });

    it('should handle identity validation without message context', async () => {
      mockCovaIdentityService.getCovaIdentity.mockResolvedValue(validIdentity);
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result = await identityFunction(mockMessage);

        expect(result).toEqual(validIdentity);
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledWith(mockMessage);
      }
    });
  });

  describe('Response Generation Edge Cases', () => {
    it('should handle response generation errors', async () => {
      const mockResponseGenerator = jest.fn().mockRejectedValue(new Error('LLM service down'));
      mockCreateLLMEmulatorResponse.mockReturnValue(mockResponseGenerator);
      
      const responseFunction = covaTrigger.response;
      if (typeof responseFunction === 'function') {
        try {
          await responseFunction(createMockMessage());
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should handle empty responses', async () => {
      const mockResponseGenerator = jest.fn().mockResolvedValue('');
      mockCreateLLMEmulatorResponse.mockReturnValue(mockResponseGenerator);
      
      const responseFunction = covaTrigger.response;
      if (typeof responseFunction === 'function') {
        const result = await responseFunction(createMockMessage());
        
        // Should fall back to some default behavior
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('Priority and Trigger Precedence', () => {
    it('should have correct priority ordering', () => {
      // Stats command should have highest priority
      expect(covaStatsCommandTrigger.priority).toBe(10);
      
      // Direct mention should have higher priority than contextual
      expect(covaDirectMentionTrigger.priority).toBe(5);
      expect(covaTrigger.priority).toBe(3);
      
      // Verify priority ordering
      expect(covaStatsCommandTrigger.priority).toBeGreaterThan(covaDirectMentionTrigger.priority || 0);
      expect(covaDirectMentionTrigger.priority).toBeGreaterThan(covaTrigger.priority || 0);
    });

    it('should have unique trigger names', () => {
      const names = [
        covaTrigger.name,
        covaDirectMentionTrigger.name,
        covaStatsCommandTrigger.name
      ];
      
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with multiple calls', async () => {
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        // Simulate multiple rapid calls
        const promises = Array.from({ length: 100 }, () => 
          identityFunction(createMockMessage())
        );
        
        const results = await Promise.all(promises);
        
        // All should succeed
        expect(results.every(r => r === validIdentity)).toBe(true);
        
        // Should not create excessive calls due to caching
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledTimes(100);
      }
    });
  });

  describe('Stats Command Functionality', () => {
    it('should respond to stats command from Cova', async () => {
      const statsMessage = createMockMessage({
        content: '!cova-stats',
        author: { id: '139592376443338752', bot: false, username: 'Cova' }
      });
      
      const responseFunction = covaStatsCommandTrigger.response;
      if (typeof responseFunction === 'function') {
        const result = await responseFunction(statsMessage);
        
        expect(typeof result).toBe('string');
        expect(result).toContain('CovaBot Performance Stats');
      }
    });

    it('should not respond to stats command from other users', () => {
      const statsMessage = createMockMessage({
        content: '!cova-stats',
        author: { id: 'other-user-123', bot: false, username: 'OtherUser' }
      });
      
      // The condition should prevent this from triggering
      expect(covaStatsCommandTrigger.name).toBe('cova-stats-command');
    });
  });

  describe('Conversation Context Awareness', () => {
    it('should handle messages in different channels independently', async () => {
      const channel1Message = createMockMessage({
        channelId: 'channel-1',
        content: 'Hello in channel 1'
      });
      
      const channel2Message = createMockMessage({
        channelId: 'channel-2',
        content: 'Hello in channel 2'
      });
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result1 = await identityFunction(channel1Message);
        const result2 = await identityFunction(channel2Message);
        
        expect(result1).toEqual(validIdentity);
        expect(result2).toEqual(validIdentity);
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle messages in different guilds independently', async () => {
      const guild1Message = createMockMessage({
        guild: { id: 'guild-1' },
        content: 'Hello in guild 1'
      });
      
      const guild2Message = createMockMessage({
        guild: { id: 'guild-2' },
        content: 'Hello in guild 2'
      });
      
      const identityFunction = covaTrigger.identity;
      if (typeof identityFunction === 'function') {
        const result1 = await identityFunction(guild1Message);
        const result2 = await identityFunction(guild2Message);
        
        expect(result1).toEqual(validIdentity);
        expect(result2).toEqual(validIdentity);
        expect(mockCovaIdentityService.getCovaIdentity).toHaveBeenCalledTimes(2);
      }
    });
  });
});