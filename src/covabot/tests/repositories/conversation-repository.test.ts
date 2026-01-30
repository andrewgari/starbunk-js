/**
 * Unit tests for ConversationRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationRepository } from '@/repositories/conversation-repository';
import { PostgresService } from '@starbunk/shared/database';

describe('ConversationRepository', () => {
  let mockPgService: PostgresService;
  let repository: ConversationRepository;

  beforeEach(() => {
    // Mock PostgresService
    mockPgService = {
      query: vi.fn(),
      getClient: vi.fn(),
      transaction: vi.fn(),
    } as any;

    repository = new ConversationRepository(mockPgService);
  });

  describe('storeConversation', () => {
    it('should store a conversation and return UUID', async () => {
      const mockId = '550e8400-e29b-41d4-a716-446655440000';

      vi.spyOn(mockPgService, 'getClient').mockResolvedValue({
        query: vi.fn().mockResolvedValue({
          rows: [{ id: mockId }],
          rowCount: 1,
        }),
        release: vi.fn(),
      } as any);

      const result = await repository.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        'Hi there!',
        { hotness_score: 0.8 },
      );

      expect(result).toBe(mockId);
    });

    it('should handle null bot response', async () => {
      const mockId = '550e8400-e29b-41d4-a716-446655440001';

      vi.spyOn(mockPgService, 'getClient').mockResolvedValue({
        query: vi.fn().mockResolvedValue({
          rows: [{ id: mockId }],
          rowCount: 1,
        }),
        release: vi.fn(),
      } as any);

      const result = await repository.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello?',
        null,
      );

      expect(result).toBe(mockId);
    });
  });

  describe('getChannelContext', () => {
    it('should retrieve recent conversations in chronological order', async () => {
      const mockRows = [
        {
          user_id: 'user-1',
          message_content: 'Message 3',
          response_content: 'Response 3',
          created_at: new Date('2026-01-29T12:03:00Z'),
        },
        {
          user_id: 'user-2',
          message_content: 'Message 2',
          response_content: 'Response 2',
          created_at: new Date('2026-01-29T12:02:00Z'),
        },
        {
          user_id: 'user-1',
          message_content: 'Message 1',
          response_content: 'Response 1',
          created_at: new Date('2026-01-29T12:01:00Z'),
        },
      ];

      vi.spyOn(mockPgService, 'query').mockResolvedValue(mockRows as any);

      const result = await repository.getChannelContext('test-profile', 'channel-123', 10);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].content).toBe('Message 1'); // Oldest first
      expect(result.messages[2].content).toBe('Message 3'); // Newest last
    });

    it('should respect the limit parameter', async () => {
      vi.spyOn(mockPgService, 'query').mockImplementation(async (sql, params) => {
        expect(params?.[2]).toBe(5);
        return [];
      });

      await repository.getChannelContext('test-profile', 'channel-123', 5);

      expect(mockPgService.query).toHaveBeenCalled();
    });
  });

  describe('getUserHistory', () => {
    it('should retrieve user-specific conversation history', async () => {
      const mockRows = [
        {
          user_id: 'user-123',
          message_content: 'User message 2',
          response_content: 'Bot response 2',
          created_at: new Date('2026-01-29T12:02:00Z'),
        },
        {
          user_id: 'user-123',
          message_content: 'User message 1',
          response_content: 'Bot response 1',
          created_at: new Date('2026-01-29T12:01:00Z'),
        },
      ];

      vi.spyOn(mockPgService, 'query').mockResolvedValue(mockRows as any);

      const result = await repository.getUserHistory('test-profile', 'user-123', 20);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].userId).toBe('user-123');
      expect(result.messages[0].content).toBe('User message 1');
    });
  });

  describe('deleteOldConversations', () => {
    it('should delete conversations older than specified days', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rowCount: 42 }),
        release: vi.fn(),
      };

      vi.spyOn(mockPgService, 'getClient').mockResolvedValue(mockClient as any);

      const deletedCount = await repository.deleteOldConversations(30);

      expect(deletedCount).toBe(42);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM covabot_conversations'),
        [30],
      );
    });

    it('should use default 30 days if not specified', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rowCount: 10 }),
        release: vi.fn(),
      };

      vi.spyOn(mockPgService, 'getClient').mockResolvedValue(mockClient as any);

      await repository.deleteOldConversations();

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [30]);
    });
  });

  describe('getConversationCount', () => {
    it('should return conversation count for a profile', async () => {
      vi.spyOn(mockPgService, 'query').mockResolvedValue([{ count: '150' }] as any);

      const count = await repository.getConversationCount('test-profile');

      expect(count).toBe(150);
    });

    it('should return 0 if no conversations exist', async () => {
      vi.spyOn(mockPgService, 'query').mockResolvedValue([{ count: '0' }] as any);

      const count = await repository.getConversationCount('test-profile');

      expect(count).toBe(0);
    });
  });
});
