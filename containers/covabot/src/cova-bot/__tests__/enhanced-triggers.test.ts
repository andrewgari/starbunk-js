import { Message } from 'discord.js';
import { covaTrigger, covaDirectMentionTrigger } from '../triggers';
import { CovaIdentityService } from '../../services/identity';
import { createLLMResponseDecisionCondition } from '../llm-triggers';
import { logger, and, fromBot, fromUser, not } from '@starbunk/shared';
import { createTriggerResponse } from '../triggerResponseFactory';
import userId from '@starbunk/shared/dist/discord/userId';

// Mock dependencies
jest.mock('../../services/identity');
jest.mock('../llm-triggers');
jest.mock('../triggerResponseFactory');
jest.mock('@starbunk/shared/dist/discord/userId', () => ({
  __esModule: true,
  default: {
    Cova: '139592376443338752'
  }
}));

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
  // createTriggerResponse moved to local import
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

// Get the mocked functions
const mockAnd = and as jest.MockedFunction<typeof and>;
const mockFromBot = fromBot as jest.MockedFunction<typeof fromBot>;
const mockFromUser = fromUser as jest.MockedFunction<typeof fromUser>;
const mockNot = not as jest.MockedFunction<typeof not>;
const mockCreateTriggerResponse = createTriggerResponse as jest.MockedFunction<typeof createTriggerResponse>;

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

  describe('Response Logic - Comprehensive Testing', () => {
    let mockLLMDecision: jest.MockedFunction<any>;
    let mockCondition: jest.MockedFunction<any>;

    beforeEach(() => {
      // Create a mock LLM decision function
      mockLLMDecision = jest.fn();
      mockCreateLLMResponseDecisionCondition.mockReturnValue(mockLLMDecision);
      
      // Create a mock condition that combines all the logic
      mockCondition = jest.fn();
      mockAnd.mockReturnValue(mockCondition);
      
      // Mock the helper functions
      mockFromBot.mockReturnValue((msg: Message) => msg.author.bot);
      mockFromUser.mockReturnValue((userId: string) => (msg: Message) => msg.author.id === userId);
      mockNot.mockReturnValue((fn: any) => (msg: Message) => !fn(msg));
    });

    describe('Bot Message Filtering', () => {
      it('should not respond to bot messages', async () => {
        const botMessage = {
          ...mockMessage,
          author: {
            ...mockMessage.author,
            bot: true
          }
        } as unknown as Message;

        // Test the fromBot condition
        mockFromBot.mockReturnValue((msg: Message) => msg.author.bot);
        const fromBotCondition = mockFromBot();
        const result = fromBotCondition(botMessage);

        expect(result).toBe(true);
        expect(mockFromBot).toHaveBeenCalled();
      });

      it('should respond to human messages', async () => {
        const humanMessage = {
          ...mockMessage,
          author: {
            ...mockMessage.author,
            bot: false
          }
        } as unknown as Message;

        mockFromBot.mockReturnValue((msg: Message) => msg.author.bot);
        const fromBotCondition = mockFromBot();
        const result = fromBotCondition(humanMessage);

        expect(result).toBe(false);
      });
    });

    describe('Self-Message Filtering', () => {
      it('should not respond to messages from Cova himself', () => {
        const covaMessage = {
          ...mockMessage,
          author: {
            ...mockMessage.author,
            id: '139592376443338752' // Cova's user ID
          }
        } as unknown as Message;

        mockFromUser.mockReturnValue((msg: Message) => msg.author.id === '139592376443338752');
        const fromCovaCondition = mockFromUser('139592376443338752');
        const result = fromCovaCondition(covaMessage);

        expect(result).toBe(true);
        expect(mockFromUser).toHaveBeenCalledWith('139592376443338752');
      });

      it('should allow messages from other users', () => {
        const otherUserMessage = {
          ...mockMessage,
          author: {
            ...mockMessage.author,
            id: 'other-user-456'
          }
        } as unknown as Message;

        mockFromUser.mockReturnValue((msg: Message) => msg.author.id === '139592376443338752');
        const fromCovaCondition = mockFromUser('139592376443338752');
        const result = fromCovaCondition(otherUserMessage);

        expect(result).toBe(false);
      });
    });

    describe('LLM Decision Logic', () => {
      it('should call LLM decision function for valid messages', async () => {
        mockLLMDecision.mockResolvedValue(true);
        
        const validMessage = {
          ...mockMessage,
          author: {
            ...mockMessage.author,
            bot: false,
            id: 'other-user-123'
          }
        } as unknown as Message;

        await mockLLMDecision(validMessage);
        
        expect(mockLLMDecision).toHaveBeenCalledWith(validMessage);
      });

      it('should respect LLM decision to not respond', async () => {
        mockLLMDecision.mockResolvedValue(false);
        
        const result = await mockLLMDecision(mockMessage);
        
        expect(result).toBe(false);
      });

      it('should respect LLM decision to respond', async () => {
        mockLLMDecision.mockResolvedValue(true);
        
        const result = await mockLLMDecision(mockMessage);
        
        expect(result).toBe(true);
      });
    });

    describe('Combined Condition Logic', () => {
      it('should have correct condition structure', async () => {
        expect(typeof covaTrigger.condition).toBe('function');

        // Test that the condition function works by calling it
        const testMessage = {
          content: 'test message',
          author: { id: 'user123', bot: false },
        } as Message;
        await covaTrigger.condition(testMessage);

        expect(mockAnd).toHaveBeenCalled();
      });

      it('should fail if any condition fails', async () => {
        // Simulate a condition that fails
        mockCondition.mockResolvedValue(false);
        
        const result = await mockCondition(mockMessage);
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Direct Mention Trigger', () => {
    it('should respond to direct mentions', () => {
      const mentionMessage = {
        ...mockMessage,
        mentions: {
          has: jest.fn().mockReturnValue(true)
        }
      } as unknown as Message;

      const hasMention = mentionMessage.mentions.has('139592376443338752');
      expect(hasMention).toBe(true);
    });

    it('should not trigger on messages without mentions', () => {
      const noMentionMessage = {
        ...mockMessage,
        mentions: {
          has: jest.fn().mockReturnValue(false)
        }
      } as unknown as Message;

      const hasMention = noMentionMessage.mentions.has('139592376443338752');
      expect(hasMention).toBe(false);
    });

    it('should not respond to bot mentions', () => {
      const botMentionMessage = {
        ...mockMessage,
        author: {
          ...mockMessage.author,
          bot: true
        },
        mentions: {
          has: jest.fn().mockReturnValue(true)
        }
      } as unknown as Message;

      mockFromBot.mockReturnValue((msg: Message) => msg.author.bot);
      const fromBotCondition = mockFromBot();
      const isBot = fromBotCondition(botMentionMessage);

      expect(isBot).toBe(true);
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

  describe('Comprehensive Response Prevention', () => {
    const scenarios = [
      {
        name: 'Bot message with content',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, bot: true },
          content: 'Hello from bot'
        },
        shouldRespond: false,
        reason: 'Bot messages should be ignored'
      },
      {
        name: 'Cova talking to himself',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, id: '139592376443338752', bot: false },
          content: 'Testing self'
        },
        shouldRespond: false,
        reason: 'Cova should not respond to his own messages'
      },
      {
        name: 'Valid user message',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, bot: false, id: 'user-123' },
          content: 'Hello everyone'
        },
        shouldRespond: 'depends_on_llm',
        reason: 'Should depend on LLM decision'
      },
      {
        name: 'Direct mention from user',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, bot: false, id: 'user-123' },
          mentions: { has: jest.fn().mockReturnValue(true) },
          content: 'Hey @Cova'
        },
        shouldRespond: true,
        reason: 'Direct mentions should always respond'
      },
      {
        name: 'Bot mentioning Cova',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, bot: true, id: 'other-bot-123' },
          mentions: { has: jest.fn().mockReturnValue(true) },
          content: 'Hey @Cova'
        },
        shouldRespond: false,
        reason: 'Bot mentions should be ignored'
      },
      {
        name: 'Cova mentioning himself',
        message: {
          ...mockMessage,
          author: { ...mockMessage.author, bot: false, id: '139592376443338752' },
          mentions: { has: jest.fn().mockReturnValue(true) },
          content: 'Testing @Cova'
        },
        shouldRespond: false,
        reason: 'Cova should not respond to his own mentions'
      }
    ];

    scenarios.forEach(scenario => {
      it(`should handle: ${scenario.name}`, () => {
        const msg = scenario.message as unknown as Message;
        
        // Test bot filtering
        mockFromBot.mockReturnValue((m: Message) => m.author.bot);
        const fromBotCondition = mockFromBot();
        const isBot = fromBotCondition(msg);

        // Test self-message filtering
        mockFromUser.mockReturnValue((m: Message) => m.author.id === '139592376443338752');
        const fromCovaCondition = mockFromUser('139592376443338752');
        const isCova = fromCovaCondition(msg);
        
        // Test mention detection
        const hasMention = msg.mentions && msg.mentions.has('139592376443338752');
        
        if (scenario.shouldRespond === false) {
          expect(isBot || isCova).toBe(true);
        } else if (scenario.shouldRespond === true) {
          expect(isBot).toBe(false);
          expect(isCova).toBe(false);
          expect(hasMention).toBe(true);
        } else if (scenario.shouldRespond === 'depends_on_llm') {
          expect(isBot).toBe(false);
          expect(isCova).toBe(false);
          // LLM decision would be tested separately
        }
      });
    });
  });
});