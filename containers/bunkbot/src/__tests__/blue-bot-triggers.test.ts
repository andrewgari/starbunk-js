/**
 * BlueBot Trigger Tests
 * 
 * Tests the BlueBot trigger conditions to ensure they work correctly
 * and can respond to the expected E2E test messages.
 */

import { Message } from 'discord.js';
import { triggerBlueBotMention } from '../reply-bots/blue-bot/triggers';
import { BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES } from '../reply-bots/blue-bot/constants';

// Mock logger to avoid console output during tests
jest.mock('@starbunk/shared', () => ({
  ...jest.requireActual('@starbunk/shared'),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  isDebugMode: jest.fn().mockReturnValue(false),
}));

// Mock ConfigurationService
jest.mock('../services/configurationService', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => ({
    getUserIdByUsername: jest.fn().mockResolvedValue('123456789'),
  })),
}));

// Create a mock Discord message
function createMockMessage(content: string, authorId = '987654321', authorUsername = 'TestUser'): Partial<Message> {
  return {
    content,
    author: {
      id: authorId,
      username: authorUsername,
      bot: false,
    } as any,
    channel: {
      id: '123456789',
      send: jest.fn().mockResolvedValue({}),
    } as any,
    guild: {
      id: '987654321',
    } as any,
  };
}

describe('BlueBot Triggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pattern Matching', () => {
    it('should match "blu?" with Default pattern', () => {
      const pattern = BLUE_BOT_PATTERNS.Default;
      expect(pattern.test('blu?')).toBe(true);
      expect(pattern.test('blu')).toBe(true);
      expect(pattern.test('blue')).toBe(true);
      expect(pattern.test('BLUE')).toBe(true);
      expect(pattern.test('bluu')).toBe(true);
    });

    it('should not match unrelated words', () => {
      const pattern = BLUE_BOT_PATTERNS.Default;
      expect(pattern.test('hello')).toBe(false);
      expect(pattern.test('test')).toBe(false);
      expect(pattern.test('red')).toBe(false);
    });

    it('should match "blu?" in context', () => {
      const pattern = BLUE_BOT_PATTERNS.Default;
      expect(pattern.test('Hey blu?')).toBe(true);
      expect(pattern.test('What about blu?')).toBe(true);
      expect(pattern.test('blu? anyone?')).toBe(true);
    });
  });

  describe('BlueBot Mention Trigger', () => {
    it('should have correct trigger properties', () => {
      expect(triggerBlueBotMention.name).toBe('blue-standard');
      expect(triggerBlueBotMention.priority).toBe(5);
      expect(triggerBlueBotMention.identity.botName).toBe('BlueBot');
      expect(triggerBlueBotMention.identity.avatarUrl).toBeDefined();
    });

    it('should respond with correct message', async () => {
      const mockMessage = createMockMessage('blu?') as Message;
      const response = await triggerBlueBotMention.response(mockMessage);
      expect(response).toBe(BLUE_BOT_RESPONSES.Default);
      expect(response).toBe('Did somebody say Blu?');
    });

    it('should match E2E test trigger message', async () => {
      const mockMessage = createMockMessage('blu?') as Message;
      const shouldTrigger = await triggerBlueBotMention.condition(mockMessage);
      expect(shouldTrigger).toBe(true);
    });

    it('should match various blue-related messages', async () => {
      const testMessages = [
        'blu?',
        'blue',
        'BLUE',
        'Hey blu!',
        'What about blue?',
        'bluu',
        'bluuu',
      ];

      for (const content of testMessages) {
        const mockMessage = createMockMessage(content) as Message;
        const shouldTrigger = await triggerBlueBotMention.condition(mockMessage);
        expect(shouldTrigger).toBe(true);
      }
    });

    it('should not match non-blue messages', async () => {
      const testMessages = [
        'hello',
        'test',
        'red',
        'green',
        'yellow',
        'random message',
      ];

      for (const content of testMessages) {
        const mockMessage = createMockMessage(content) as Message;
        const shouldTrigger = await triggerBlueBotMention.condition(mockMessage);
        expect(shouldTrigger).toBe(false);
      }
    });
  });

  describe('Response Consistency', () => {
    it('should return consistent response for same trigger', async () => {
      const mockMessage = createMockMessage('blu?') as Message;
      
      const response1 = await triggerBlueBotMention.response(mockMessage);
      const response2 = await triggerBlueBotMention.response(mockMessage);
      
      expect(response1).toBe(response2);
      expect(response1).toBe('Did somebody say Blu?');
    });
  });

  describe('Identity Configuration', () => {
    it('should have correct bot identity', () => {
      const identity = triggerBlueBotMention.identity;
      expect(identity.botName).toBe('BlueBot');
      expect(typeof identity.avatarUrl).toBe('string');
      expect(identity.avatarUrl.length).toBeGreaterThan(0);
    });
  });
});
