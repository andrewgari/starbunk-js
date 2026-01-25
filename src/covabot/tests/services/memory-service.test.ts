import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../../src/services/memory-service';
import { ConversationRepository } from '../../src/repositories/conversation-repository';
import { UserFactRepository } from '../../src/repositories/user-fact-repository';

describe('MemoryService', () => {
  let mockConversationRepo: Partial<ConversationRepository>;
  let mockUserFactRepo: Partial<UserFactRepository>;
  let memoryService: MemoryService;

  beforeEach(() => {
    mockConversationRepo = {
      storeConversation: vi.fn().mockReturnValue(1),
      getChannelContext: vi.fn().mockReturnValue({ messages: [] }),
      getUserHistory: vi.fn().mockReturnValue({ messages: [] }),
      pruneOldConversations: vi.fn().mockReturnValue(0),
    };

    mockUserFactRepo = {
      storeUserFact: vi.fn(),
      getUserFacts: vi.fn().mockReturnValue([]),
      getUserFactsByType: vi.fn().mockReturnValue([]),
    };

    memoryService = new MemoryService(
      mockConversationRepo as ConversationRepository,
      mockUserFactRepo as UserFactRepository,
    );
  });

  describe('storeConversation', () => {
    it('should store a conversation', () => {
      vi.mocked(mockConversationRepo.storeConversation!).mockReturnValue(42);

      const id = memoryService.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        'Hello human!',
      );

      expect(id).toBe(42);
      expect(mockConversationRepo.storeConversation).toHaveBeenCalledWith(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        'Hello human!',
      );
    });

    it('should store conversation without bot response', () => {
      vi.mocked(mockConversationRepo.storeConversation!).mockReturnValue(43);

      const id = memoryService.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        null,
      );

      expect(id).toBe(43);
      expect(mockConversationRepo.storeConversation).toHaveBeenCalledWith(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        null,
      );
    });
  });

  describe('getChannelContext', () => {
    it('should retrieve recent channel messages in chronological order', () => {
      const mockMessages = [
        {
          userId: 'user-1',
          userName: 'User1',
          content: 'Message 1',
          botResponse: 'Response 1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          userId: 'user-2',
          userName: 'User2',
          content: 'Message 2',
          botResponse: 'Response 2',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          userId: 'user-1',
          userName: 'User1',
          content: 'Message 3',
          botResponse: null,
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ];

      vi.mocked(mockConversationRepo.getChannelContext!).mockReturnValue({
        messages: mockMessages,
      });

      const context = memoryService.getChannelContext('profile', 'channel-1', 10);

      expect(context.messages).toHaveLength(3);
      expect(mockConversationRepo.getChannelContext).toHaveBeenCalledWith('profile', 'channel-1', 10);
      const contents = context.messages.map(m => m.content);
      expect(contents).toContain('Message 1');
      expect(contents).toContain('Message 2');
      expect(contents).toContain('Message 3');
    });

    it('should respect limit parameter', () => {
      const mockMessages = Array.from({ length: 5 }, (_, i) => ({
        userId: 'user-1',
        userName: 'User1',
        content: `Message ${i}`,
        botResponse: null,
        timestamp: new Date(),
      }));

      vi.mocked(mockConversationRepo.getChannelContext!).mockReturnValue({
        messages: mockMessages,
      });

      const context = memoryService.getChannelContext('profile', 'channel-1', 5);

      expect(mockConversationRepo.getChannelContext).toHaveBeenCalledWith('profile', 'channel-1', 5);
      expect(context.messages).toHaveLength(5);
    });

    it('should filter by channel', () => {
      const mockMessages1 = [
        {
          userId: 'user-1',
          userName: 'User1',
          content: 'Channel 1',
          botResponse: null,
          timestamp: new Date(),
        },
      ];
      const mockMessages2 = [
        {
          userId: 'user-1',
          userName: 'User1',
          content: 'Channel 2',
          botResponse: null,
          timestamp: new Date(),
        },
      ];

      vi.mocked(mockConversationRepo.getChannelContext!)
        .mockReturnValueOnce({ messages: mockMessages1 })
        .mockReturnValueOnce({ messages: mockMessages2 });

      const context1 = memoryService.getChannelContext('profile', 'channel-1', 10);
      const context2 = memoryService.getChannelContext('profile', 'channel-2', 10);

      expect(context1.messages).toHaveLength(1);
      expect(context2.messages).toHaveLength(1);
    });
  });

  describe('storeUserFact / getUserFacts', () => {
    it('should store and retrieve user facts', () => {
      const mockFacts = [
        { type: 'interest' as const, key: 'topic', value: 'programming', confidence: 0.9 },
      ];

      vi.mocked(mockUserFactRepo.getUserFacts!).mockReturnValue(mockFacts);

      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'programming', 0.9);
      const facts = memoryService.getUserFacts('profile', 'user-1');

      expect(mockUserFactRepo.storeUserFact).toHaveBeenCalledWith(
        'user-1',
        'interest',
        'topic',
        0.9,
        'profile',
        'programming',
      );
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe('interest');
      expect(facts[0].key).toBe('topic');
      expect(facts[0].value).toBe('programming');
      expect(facts[0].confidence).toBe(0.9);
    });

    it('should update existing fact on conflict', () => {
      const updatedFact = [
        { type: 'interest' as const, key: 'topic', value: 'gaming', confidence: 0.8 },
      ];

      vi.mocked(mockUserFactRepo.getUserFacts!).mockReturnValue(updatedFact);

      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'programming', 0.5);
      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'gaming', 0.8);

      const facts = memoryService.getUserFacts('profile', 'user-1');

      expect(facts).toHaveLength(1);
      expect(facts[0].value).toBe('gaming');
      expect(facts[0].confidence).toBe(0.8);
    });

    it('should filter facts by type', () => {
      const interests = [
        { type: 'interest' as const, key: 'hobby', value: 'coding', confidence: 1.0 },
      ];
      const preferences = [
        { type: 'preference' as const, key: 'theme', value: 'dark', confidence: 1.0 },
      ];

      vi.mocked(mockUserFactRepo.getUserFactsByType!)
        .mockReturnValueOnce(interests)
        .mockReturnValueOnce(preferences);

      memoryService.storeUserFact('profile', 'user-1', 'interest', 'hobby', 'coding', 1.0);
      memoryService.storeUserFact('profile', 'user-1', 'preference', 'theme', 'dark', 1.0);
      memoryService.storeUserFact('profile', 'user-1', 'relationship', 'status', 'friend', 1.0);

      const retrievedInterests = memoryService.getUserFactsByType('profile', 'user-1', 'interest');
      const retrievedPreferences = memoryService.getUserFactsByType('profile', 'user-1', 'preference');

      expect(retrievedInterests).toHaveLength(1);
      expect(retrievedPreferences).toHaveLength(1);
    });
  });

  describe('formatContextForLlm', () => {
    it('should format conversation context for LLM', () => {
      const mockMessages = [
        {
          userId: 'user-1',
          userName: 'Alice',
          content: 'Hello!',
          botResponse: 'Hi Alice!',
          timestamp: new Date(),
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          content: 'What are we talking about?',
          botResponse: null,
          timestamp: new Date(),
        },
      ];

      vi.mocked(mockConversationRepo.getChannelContext!).mockReturnValue({
        messages: mockMessages,
      });

      const context = memoryService.getChannelContext('profile', 'channel-1', 10);
      const formatted = memoryService.formatContextForLlm(context, 'Bot');

      expect(formatted).toContain('Alice: Hello!');
      expect(formatted).toContain('Bot: Hi Alice!');
      expect(formatted).toContain('Bob: What are we talking about?');
    });

    it('should return empty string for empty context', () => {
      const context = { messages: [] };
      const formatted = memoryService.formatContextForLlm(context, 'Bot');

      expect(formatted).toBe('');
    });
  });

  describe('formatFactsForLlm', () => {
    it('should format user facts for LLM', () => {
      const facts = [
        { type: 'interest' as const, key: 'hobby', value: 'coding', confidence: 1 },
        { type: 'preference' as const, key: 'language', value: 'TypeScript', confidence: 1 },
      ];

      const formatted = memoryService.formatFactsForLlm(facts, 'Alice');

      expect(formatted).toContain("Alice's interests: hobby: coding");
      expect(formatted).toContain("Alice's preferences: language: TypeScript");
    });
  });

  describe('pruneOldConversations', () => {
    it('should delete old conversations', () => {
      vi.mocked(mockConversationRepo.pruneOldConversations!).mockReturnValue(1);

      const deleted = memoryService.pruneOldConversations('profile', 30);

      expect(deleted).toBe(1);
      expect(mockConversationRepo.pruneOldConversations).toHaveBeenCalledWith('profile', 30);
    });
  });
});
