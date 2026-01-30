import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationRepository } from '../../src/repositories/conversation-repository';
import { getTraceService } from '@starbunk/shared';
import { PostgresService } from '@starbunk/shared/database';

describe('Repository Tracing', () => {
  let mockPgService: any;
  let conversationRepo: ConversationRepository;
  let tracingMock: ReturnType<typeof getTraceService>;

  beforeEach(() => {
    // Disable real OTLP export in tests
    process.env.OTEL_ENABLED = 'false';

    // Mock PostgresService with test data
    const storedMessages: any[] = [];

    mockPgService = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        // Simulate error for nonexistent table
        if (sql.includes('nonexistent_table')) {
          throw new Error('relation "nonexistent_table" does not exist');
        }

        // SELECT query - return stored messages as array (not {rows: []} object)
        if (sql.includes('SELECT')) {
          return storedMessages.map((msg, idx) => ({
            ...msg,
            created_at: new Date(Date.now() + idx * 1000).toISOString(),
          }));
        }
        return [];
      }),
      getClient: vi.fn(async () => ({
        query: vi.fn(async (sql: string, params?: any[]) => {
          // Simulate error for nonexistent table
          if (sql.includes('nonexistent_table')) {
            throw new Error('relation "nonexistent_table" does not exist');
          }

          // INSERT query - store message and return {rows, rowCount} for client.query
          if (sql.includes('INSERT') && sql.includes('RETURNING')) {
            const id = `id-${Date.now()}`;
            storedMessages.push({
              id,
              profile_id: params?.[0],
              channel_id: params?.[1],
              user_id: params?.[2],
              user_name: params?.[3],
              message_content: params?.[4],
              response_content: params?.[5],
            });
            return { rows: [{ id }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      })),
    };

    conversationRepo = new ConversationRepository(mockPgService);
    tracingMock = getTraceService('data-access');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ConversationRepository tracing', () => {
    it('should emit db.query span when getting channel context', async () => {
      const startSpanSpy = vi.spyOn(tracingMock, 'startSpan');

      await conversationRepo.getChannelContext('profile-123', 'channel-456', 10);

      // Should have called startSpan for db.query
      expect(startSpanSpy).toHaveBeenCalledWith(
        'db.query',
        expect.objectContaining({
          'db.system': 'postgresql',
          'db.statement': expect.stringContaining('SELECT'),
          'db.param_count': 3,
        }),
      );

      // Should have called startSpan for conversation.getChannelContext
      expect(startSpanSpy).toHaveBeenCalledWith(
        'conversation.getChannelContext',
        expect.objectContaining({
          'conversation.channel_id': 'channel-456',
          'conversation.profile_id': 'profile-123',
        }),
      );
    });

    it('should emit db.execute span when storing conversation', async () => {
      const startSpanSpy = vi.spyOn(tracingMock, 'startSpan');

      await conversationRepo.storeConversation(
        'profile-123',
        'channel-456',
        'user-789',
        'TestUser',
        'Hello!',
        'Hi there!',
      );

      // Should have called startSpan for conversation.store (first)
      expect(startSpanSpy).toHaveBeenNthCalledWith(
        1,
        'conversation.store',
        expect.objectContaining({
          'conversation.channel_id': 'channel-456',
          'conversation.user_id': 'user-789',
        }),
      );

      // Should have called startSpan for db.execute (second)
      expect(startSpanSpy).toHaveBeenNthCalledWith(
        2,
        'db.execute',
        expect.objectContaining({
          'db.system': 'postgresql',
          'db.statement': expect.stringContaining('INSERT'),
          'db.param_count': 6,
        }),
      );
    });

    it('should set db.record_count attribute on query span', async () => {
      // Insert some test data
      await conversationRepo.storeConversation(
        'profile-123',
        'channel-456',
        'user-789',
        'TestUser',
        'Message 1',
        'Response 1',
      );
      await conversationRepo.storeConversation(
        'profile-123',
        'channel-456',
        'user-789',
        'TestUser',
        'Message 2',
        'Response 2',
      );

      const mockSpan = {
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      };

      vi.spyOn(tracingMock, 'startSpan').mockReturnValue(mockSpan as any);

      await conversationRepo.getChannelContext('profile-123', 'channel-456', 10);

      // Should set record_count attribute
      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'db.record_count': 2,
        }),
      );
    });

    it('should set db.rows_affected attribute on execute span', async () => {
      const mockSpan = {
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      };

      vi.spyOn(tracingMock, 'startSpan').mockReturnValue(mockSpan as any);

      await conversationRepo.storeConversation(
        'profile-123',
        'channel-456',
        'user-789',
        'TestUser',
        'Hello!',
        'Hi there!',
      );

      // Should set rows_affected attribute
      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'db.rows_affected': 1,
        }),
      );
    });

    it('should record exception on span when query fails', async () => {
      const mockSpan = {
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      };

      vi.spyOn(tracingMock, 'startSpan').mockReturnValue(mockSpan as any);

      // Try to query a non-existent table
      try {
        await conversationRepo['query']('SELECT * FROM nonexistent_table', []);
      } catch (error) {
        // Expected to throw
      }

      // Should have recorded the exception
      expect(mockSpan.recordException).toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should end span after operation completes', async () => {
      const mockSpan = {
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      };

      vi.spyOn(tracingMock, 'startSpan').mockReturnValue(mockSpan as any);

      await conversationRepo.getChannelContext('profile-123', 'channel-456', 10);

      // Should have ended all spans
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });
});
