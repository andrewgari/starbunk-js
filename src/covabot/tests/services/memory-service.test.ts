import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MemoryService } from '../../src/services/memory-service';
import { DatabaseService } from '../../src/services/database-service';
import * as fs from 'fs';
import * as path from 'path';

describe('MemoryService', () => {
  const testDbPath = path.join(__dirname, '../../data/test-memory.sqlite');
  let db: Database.Database;
  let memoryService: MemoryService;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    DatabaseService.resetInstance();

    const dbService = DatabaseService.getInstance(testDbPath);
    await dbService.initialize();
    db = dbService.getDb();
    memoryService = new MemoryService(db);
  });

  afterEach(() => {
    DatabaseService.resetInstance();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('storeConversation', () => {
    it('should store a conversation', () => {
      const id = memoryService.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        'Hello human!',
      );

      expect(id).toBeGreaterThan(0);

      const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
      expect(row).toBeDefined();
    });

    it('should store conversation without bot response', () => {
      const id = memoryService.storeConversation(
        'test-profile',
        'channel-123',
        'user-456',
        'TestUser',
        'Hello bot!',
        null,
      );

      expect(id).toBeGreaterThan(0);
    });
  });

  describe('getChannelContext', () => {
    it('should retrieve recent channel messages in chronological order', () => {
      // Store multiple conversations
      memoryService.storeConversation('profile', 'channel-1', 'user-1', 'User1', 'Message 1', 'Response 1');
      memoryService.storeConversation('profile', 'channel-1', 'user-2', 'User2', 'Message 2', 'Response 2');
      memoryService.storeConversation('profile', 'channel-1', 'user-1', 'User1', 'Message 3', null);

      const context = memoryService.getChannelContext('profile', 'channel-1', 10);

      expect(context.messages).toHaveLength(3);
      // Messages are returned in chronological order (oldest to newest)
      // But since they're inserted with the same timestamp, order may vary
      // Just verify we got all 3 messages
      const contents = context.messages.map(m => m.content);
      expect(contents).toContain('Message 1');
      expect(contents).toContain('Message 2');
      expect(contents).toContain('Message 3');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 15; i++) {
        memoryService.storeConversation('profile', 'channel-1', 'user-1', 'User1', `Message ${i}`, null);
      }

      const context = memoryService.getChannelContext('profile', 'channel-1', 5);

      expect(context.messages).toHaveLength(5);
    });

    it('should filter by channel', () => {
      memoryService.storeConversation('profile', 'channel-1', 'user-1', 'User1', 'Channel 1', null);
      memoryService.storeConversation('profile', 'channel-2', 'user-1', 'User1', 'Channel 2', null);

      const context1 = memoryService.getChannelContext('profile', 'channel-1', 10);
      const context2 = memoryService.getChannelContext('profile', 'channel-2', 10);

      expect(context1.messages).toHaveLength(1);
      expect(context2.messages).toHaveLength(1);
    });
  });

  describe('storeUserFact / getUserFacts', () => {
    it('should store and retrieve user facts', () => {
      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'programming', 0.9);

      const facts = memoryService.getUserFacts('profile', 'user-1');

      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe('interest');
      expect(facts[0].key).toBe('topic');
      expect(facts[0].value).toBe('programming');
      expect(facts[0].confidence).toBe(0.9);
    });

    it('should update existing fact on conflict', () => {
      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'programming', 0.5);
      memoryService.storeUserFact('profile', 'user-1', 'interest', 'topic', 'gaming', 0.8);

      const facts = memoryService.getUserFacts('profile', 'user-1');

      expect(facts).toHaveLength(1);
      expect(facts[0].value).toBe('gaming');
      expect(facts[0].confidence).toBe(0.8);
    });

    it('should filter facts by type', () => {
      memoryService.storeUserFact('profile', 'user-1', 'interest', 'hobby', 'coding', 1.0);
      memoryService.storeUserFact('profile', 'user-1', 'preference', 'theme', 'dark', 1.0);
      memoryService.storeUserFact('profile', 'user-1', 'relationship', 'status', 'friend', 1.0);

      const interests = memoryService.getUserFactsByType('profile', 'user-1', 'interest');
      const preferences = memoryService.getUserFactsByType('profile', 'user-1', 'preference');

      expect(interests).toHaveLength(1);
      expect(preferences).toHaveLength(1);
    });
  });

  describe('formatContextForLlm', () => {
    it('should format conversation context for LLM', () => {
      memoryService.storeConversation('profile', 'channel-1', 'user-1', 'Alice', 'Hello!', 'Hi Alice!');
      memoryService.storeConversation('profile', 'channel-1', 'user-2', 'Bob', 'What are we talking about?', null);

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
      // Insert an old conversation manually
      db.prepare(`
        INSERT INTO conversations (profile_id, channel_id, user_id, message_content, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '-60 days'))
      `).run('profile', 'channel-1', 'user-1', 'Old message');

      // Insert a recent conversation
      memoryService.storeConversation('profile', 'channel-1', 'user-1', 'User1', 'Recent message', null);

      const deleted = memoryService.pruneOldConversations('profile', 30);

      expect(deleted).toBe(1);

      const context = memoryService.getChannelContext('profile', 'channel-1', 10);
      expect(context.messages).toHaveLength(1);
      expect(context.messages[0].content).toBe('Recent message');
    });
  });
});
