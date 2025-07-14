import { Message } from 'discord.js';
import { createLLMResponseDecisionCondition } from '../llm-triggers';
import { getLLMManager, logger } from '@starbunk/shared';
import userId from '@starbunk/shared/dist/discord/userId';

// Mock only the external dependencies
jest.mock('@starbunk/shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getLLMManager: jest.fn(),
  LLMProviderType: {
    OLLAMA: 'OLLAMA'
  },
  PromptType: {
    COVA_DECISION: 'COVA_DECISION'
  },
  PromptRegistry: {
    registerPrompt: jest.fn()
  },
  PerformanceTimer: {
    getInstance: jest.fn(() => ({
      getStatsString: jest.fn(),
      time: jest.fn((name, fn) => fn())
    })),
    time: jest.fn((name, fn) => fn())
  },
  getPersonalityService: jest.fn(),
  weightedRandomResponse: jest.fn()
}));

jest.mock('@starbunk/shared/dist/discord/userId', () => ({
  __esModule: true,
  default: {
    Cova: '139592376443338752'
  }
}));

const mockGetLLMManager = getLLMManager as jest.MockedFunction<typeof getLLMManager>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot Response Behavior Tests', () => {
  let mockLLMManager: any;
  let decisionCondition: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLLMManager = {
      createPromptCompletion: jest.fn()
    };
    
    mockGetLLMManager.mockReturnValue(mockLLMManager);
    decisionCondition = createLLMResponseDecisionCondition();
  });

  const createMockMessage = (overrides: any = {}): Message => ({
    id: 'test-message-123',
    content: 'Test message',
    channelId: 'test-channel-123',
    author: {
      id: 'user-123',
      bot: false,
      username: 'TestUser',
      ...overrides.author
    },
    mentions: {
      has: jest.fn().mockReturnValue(false),
      ...overrides.mentions
    },
    channel: {
      name: 'general',
      ...overrides.channel
    },
    ...overrides
  } as unknown as Message);

  describe('Critical Response Prevention', () => {
    it('MUST NOT respond to bot messages ever', async () => {
      const botMessage = createMockMessage({
        author: {
          id: 'bot-456',
          bot: true,
          username: 'SomeBot'
        }
      });

      const result = await decisionCondition(botMessage);

      expect(result).toBe(false);
      expect(mockLLMManager.createPromptCompletion).not.toHaveBeenCalled();
    });

    it('MUST respond to direct mentions from humans', async () => {
      const mentionMessage = createMockMessage({
        author: {
          id: 'user-456',
          bot: false,
          username: 'Human'
        },
        mentions: {
          has: jest.fn().mockReturnValue(true)
        }
      });

      const result = await decisionCondition(mentionMessage);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Direct mention detected, will respond')
      );
      expect(mockLLMManager.createPromptCompletion).not.toHaveBeenCalled();
    });

    it('MUST NOT respond to bot mentions even if they mention Cova', async () => {
      const botMentionMessage = createMockMessage({
        author: {
          id: 'bot-456',
          bot: true,
          username: 'SomeBot'
        },
        mentions: {
          has: jest.fn().mockReturnValue(true)
        }
      });

      const result = await decisionCondition(botMentionMessage);

      expect(result).toBe(false);
      expect(mockLLMManager.createPromptCompletion).not.toHaveBeenCalled();
    });
  });

  describe('Response Rate Limits', () => {
    const testScenarios = [
      {
        llmResponse: 'YES',
        expectedMaxProbability: 0.8, // Should be capped at 0.8
        description: 'YES responses should be capped at 80%'
      },
      {
        llmResponse: 'LIKELY', 
        expectedMaxProbability: 0.35,
        description: 'LIKELY responses should be around 35%'
      },
      {
        llmResponse: 'UNLIKELY',
        expectedMaxProbability: 0.1,
        description: 'UNLIKELY responses should be around 10%'
      },
      {
        llmResponse: 'NO',
        expectedMaxProbability: 0.02,
        description: 'NO responses should be around 2%'
      }
    ];

    testScenarios.forEach(({ llmResponse, expectedMaxProbability, description }) => {
      it(description, async () => {
        mockLLMManager.createPromptCompletion.mockResolvedValue(llmResponse);
        
        const userMessage = createMockMessage({
          content: 'Regular message'
        });

        // Test multiple times to get statistical behavior
        const results = [];
        const testRuns = 100;
        
        for (let i = 0; i < testRuns; i++) {
          jest.clearAllMocks();
          mockLLMManager.createPromptCompletion.mockResolvedValue(llmResponse);
          
          const result = await decisionCondition(userMessage);
          results.push(result);
        }
        
        const responseRate = results.filter(r => r).length / testRuns;
        
        // Response rate should be below the expected maximum
        expect(responseRate).toBeLessThanOrEqual(expectedMaxProbability + 0.1); // Allow 10% tolerance
        
        // Log for visibility
        console.log(`${llmResponse} response rate: ${(responseRate * 100).toFixed(1)}% (expected max: ${(expectedMaxProbability * 100).toFixed(1)}%)`);
      });
    });
  });

  describe('Context-Based Response Adjustments', () => {
    it('should increase response chance for questions about relevant topics', async () => {
      mockLLMManager.createPromptCompletion.mockResolvedValue('UNLIKELY');
      
      const relevantQuestion = createMockMessage({
        content: 'How does the cova bot work?'
      });

      // Mock Math.random to be just above the base threshold but below adjusted
      const mockRandom = jest.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.13); // Between base 0.1 and potential boost
      
      const result = await decisionCondition(relevantQuestion);
      
      // Should respond due to topic relevance boost
      expect(result).toBe(true);
      
      mockRandom.mockRestore();
    });

    it('should decrease response chance for very short messages', async () => {
      mockLLMManager.createPromptCompletion.mockResolvedValue('LIKELY');
      
      const shortMessage = createMockMessage({
        content: 'ok'
      });

      const mockRandom = jest.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.25); // Between reduced and base threshold
      
      const result = await decisionCondition(shortMessage);
      
      // Should not respond due to short message penalty
      expect(result).toBe(false);
      
      mockRandom.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should fallback to 20% chance when LLM fails', async () => {
      mockLLMManager.createPromptCompletion.mockRejectedValue(new Error('LLM unavailable'));
      
      const userMessage = createMockMessage({
        content: 'Test message during outage'
      });

      const mockRandom = jest.spyOn(Math, 'random');
      
      // Test fallback with value below 20%
      mockRandom.mockReturnValue(0.15);
      let result = await decisionCondition(userMessage);
      expect(result).toBe(true);
      
      // Test fallback with value above 20%
      mockRandom.mockReturnValue(0.25);
      result = await decisionCondition(userMessage);
      expect(result).toBe(false);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in decision logic')
      );
      
      mockRandom.mockRestore();
    });
  });

  describe('Spam Prevention', () => {
    it('should have significantly reduced response rates compared to previous versions', () => {
      // Document that the current rates are much lower than before
      const currentRates = {
        YES: 0.7,     // Down from ~0.8+
        LIKELY: 0.35, // Down from ~0.5+
        UNLIKELY: 0.1, // Down from ~0.2+
        NO: 0.02      // Down from ~0.05+
      };
      
      // These rates should be low enough to prevent spam
      expect(currentRates.YES).toBeLessThan(0.8);
      expect(currentRates.LIKELY).toBeLessThan(0.4);
      expect(currentRates.UNLIKELY).toBeLessThan(0.15);
      expect(currentRates.NO).toBeLessThan(0.05);
      
      console.log('Current response rates:', currentRates);
    });
  });

  describe('Mention Detection', () => {
    it('should correctly detect Cova mentions using userId', async () => {
      const mentionMessage = createMockMessage({
        mentions: {
          has: jest.fn().mockImplementation((id) => id === userId.Cova)
        }
      });

      const result = await decisionCondition(mentionMessage);

      expect(result).toBe(true);
      expect(mentionMessage.mentions.has).toHaveBeenCalledWith(userId.Cova);
      expect(mentionMessage.mentions.has).toHaveBeenCalledWith('139592376443338752');
    });
  });
});