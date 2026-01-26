/**
 * ConversationRepository - Data access layer for conversation history
 *
 * Provides a clean abstraction over conversation operations,
 * managing conversation storage, retrieval, and pruning of conversation records.
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import {
  ConversationRow,
  ConversationContext,
} from '@/models/memory-types';

const logger = logLayer.withPrefix('ConversationRepository');

export class ConversationRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Store a conversation exchange
   */
  storeConversation(
    profileId: string,
    channelId: string,
    userId: string,
    userName: string | null,
    messageContent: string,
    botResponse: string | null,
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (profile_id, channel_id, user_id, user_name, message_content, bot_response)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(profileId, channelId, userId, userName, messageContent, botResponse);

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
      user_id: userId,
      conversation_id: result.lastInsertRowid,
    }).debug('Conversation stored');

    return Number(result.lastInsertRowid);
  }

  /**
   * Get recent conversation context for a channel
   */
  getChannelContext(
    profileId: string,
    channelId: string,
    limit: number = 10,
  ): ConversationContext {
    // Validate and sanitize limit parameter
    const validLimit = Math.max(1, Math.min(1000, Math.floor(Math.abs(limit))));

    const stmt = this.db.prepare(`
      SELECT user_id, user_name, message_content, bot_response, created_at
      FROM conversations
      WHERE profile_id = ? AND channel_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(profileId, channelId, validLimit) as Pick<
      ConversationRow,
      'user_id' | 'user_name' | 'message_content' | 'bot_response' | 'created_at'
    >[];

    // Reverse to get chronological order
    const messages = rows.reverse().map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      content: row.message_content,
      botResponse: row.bot_response,
      timestamp: new Date(row.created_at),
    }));

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
      messages_count: messages.length,
    }).debug('Channel context retrieved');

    return { messages };
  }

  /**
   * Get conversation history with a specific user
   */
  getUserHistory(
    profileId: string,
    userId: string,
    limit: number = 20,
  ): ConversationContext {
    // Validate and sanitize limit parameter
    const validLimit = Math.max(1, Math.min(1000, Math.floor(Math.abs(limit))));

    const stmt = this.db.prepare(`
      SELECT user_id, user_name, message_content, bot_response, created_at
      FROM conversations
      WHERE profile_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(profileId, userId, validLimit) as Pick<
      ConversationRow,
      'user_id' | 'user_name' | 'message_content' | 'bot_response' | 'created_at'
    >[];

    const messages = rows.reverse().map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      content: row.message_content,
      botResponse: row.bot_response,
      timestamp: new Date(row.created_at),
    }));

    logger.withMetadata({
      profile_id: profileId,
      user_id: userId,
      messages_count: messages.length,
    }).debug('User history retrieved');

    return { messages };
  }

  /**
   * Delete old conversations to manage database size
   */
  pruneOldConversations(profileId: string, daysToKeep: number = 30): number {
    // Validate and sanitize daysToKeep to prevent SQL injection
    const validDays = Math.floor(Math.abs(daysToKeep));
    if (!Number.isFinite(validDays) || validDays < 0) {
      throw new Error('Invalid daysToKeep parameter: must be a non-negative number');
    }

    const stmt = this.db.prepare(`
      DELETE FROM conversations
      WHERE profile_id = ?
        AND created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(profileId, validDays);

    logger.withMetadata({
      profile_id: profileId,
      days_kept: validDays,
      deleted_count: result.changes,
    }).info('Old conversations pruned');

    return result.changes;
  }
}
