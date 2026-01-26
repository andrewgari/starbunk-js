import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ConversationRepository } from '../../src/repositories/conversation-repository';
import { getTraceService } from '@starbunk/shared';

describe('Repository Tracing', () => {
  let db: Database.Database;
  let conversationRepo: ConversationRepository;
  let tracingMock: ReturnType<typeof getTraceService>;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Create conversations table
    db.exec(`
      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        message_content TEXT NOT NULL,
        bot_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    conversationRepo = new ConversationRepository(db);
    tracingMock = getTraceService('data-access');
  });

  afterEach(() => {
    db.close();
  });

  describe('ConversationRepository tracing', () => {
    it('should emit db.query span when getting channel context', async () => {
      const startSpanSpy = vi.spyOn(tracingMock, 'startSpan');

      await conversationRepo.getChannelContext('profile-123', 'channel-456', 10);

      // Should have called startSpan for db.query
      expect(startSpanSpy).toHaveBeenCalledWith(
        'db.query',
        expect.objectContaining({
          'db.system': 'sqlite',
          'db.statement': expect.stringContaining('SELECT'),
          'db.param_count': 3,
        })
      );

      // Should have called startSpan for conversation.getChannelContext
      expect(startSpanSpy).toHaveBeenCalledWith(
        'conversation.getChannelContext',
        expect.objectContaining({
          'conversation.channel_id': 'channel-456',
          'conversation.profile_id': 'profile-123',
        })
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
        'Hi there!'
      );

      // Should have called startSpan for db.execute
      expect(startSpanSpy).toHaveBeenCalledWith(
        'db.execute',
        expect.objectContaining({
          'db.system': 'sqlite',
          'db.statement': expect.stringContaining('INSERT'),
          'db.param_count': 6,
        })
      );

      // Should have called startSpan for conversation.store
      expect(startSpanSpy).toHaveBeenCalledWith(
        'conversation.store',
        expect.objectContaining({
          'conversation.channel_id': 'channel-456',
          'conversation.user_id': 'user-789',
        })
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
        'Response 1'
      );
      await conversationRepo.storeConversation(
        'profile-123',
        'channel-456',
        'user-789',
        'TestUser',
        'Message 2',
        'Response 2'
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
        })
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
        'Hi there!'
      );

      // Should set rows_affected attribute
      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'db.rows_affected': 1,
        })
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
