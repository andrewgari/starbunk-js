/**
 * ConversationRepository - Data access layer for conversation history
 *
 * Provides a clean abstraction over conversation operations,
 * managing conversation storage, retrieval, and pruning of conversation records.
 */

import Database from 'better-sqlite3';
import { BaseRepository } from '@starbunk/shared';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { ConversationRow, ConversationContext } from '@/models/memory-types';

const logger = logLayer.withPrefix('ConversationRepository');

export class ConversationRepository extends BaseRepository<ConversationRow> {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Store a conversation exchange
   */
  async storeConversation(
    profileId: string,
    channelId: string,
    userId: string,
    userName: string | null,
    messageContent: string,
    botResponse: string | null,
  ): Promise<number> {
    const span = this.tracing.startSpan('conversation.store', {
      'conversation.channel_id': channelId,
      'conversation.user_id': userId,
    });

    try {
      const id = await this.executeWithId(
        `INSERT INTO conversations (profile_id, channel_id, user_id, user_name, message_content, bot_response)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [profileId, channelId, userId, userName, messageContent, botResponse],
      );

      logger
        .withMetadata({
          profile_id: profileId,
          channel_id: channelId,
          user_id: userId,
          conversation_id: id,
        })
        .debug('Conversation stored');

      return id;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Get recent conversation context for a channel
   */
  async getChannelContext(
    profileId: string,
    channelId: string,
    limit: number = 10,
  ): Promise<ConversationContext> {
    const span = this.tracing.startSpan('conversation.getChannelContext', {
      'conversation.channel_id': channelId,
      'conversation.profile_id': profileId,
    });

    try {
      const rows = await this.query<
        Pick<
          ConversationRow,
          'user_id' | 'user_name' | 'message_content' | 'bot_response' | 'created_at'
        >
      >(
        `SELECT user_id, user_name, message_content, bot_response, created_at
         FROM conversations
         WHERE profile_id = ? AND channel_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [profileId, channelId, limit],
      );

      // Reverse to get chronological order
      const messages = rows.reverse().map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        content: row.message_content,
        botResponse: row.bot_response,
        timestamp: new Date(row.created_at),
      }));

      logger
        .withMetadata({
          profile_id: profileId,
          channel_id: channelId,
          messages_count: messages.length,
        })
        .debug('Channel context retrieved');

      return { messages };
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Get conversation history with a specific user
   */
  async getUserHistory(
    profileId: string,
    userId: string,
    limit: number = 20,
  ): Promise<ConversationContext> {
    const rows = await this.query<
      Pick<
        ConversationRow,
        'user_id' | 'user_name' | 'message_content' | 'bot_response' | 'created_at'
      >
    >(
      `SELECT user_id, user_name, message_content, bot_response, created_at
       FROM conversations
       WHERE profile_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [profileId, userId, limit],
    );

    const messages = rows.reverse().map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      content: row.message_content,
      botResponse: row.bot_response,
      timestamp: new Date(row.created_at),
    }));

    logger
      .withMetadata({
        profile_id: profileId,
        user_id: userId,
        messages_count: messages.length,
      })
      .debug('User history retrieved');

    return { messages };
  }

  /**
   * Delete old conversations to manage database size
   */
  async pruneOldConversations(profileId: string, daysToKeep: number = 30): Promise<number> {
    const changes = await this.execute(
      `DELETE FROM conversations
       WHERE profile_id = ?
         AND created_at < datetime('now', '-' || ? || ' days')`,
      [profileId, daysToKeep],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        days_kept: daysToKeep,
        deleted_count: changes,
      })
      .info('Old conversations pruned');

    return changes;
  }
}
