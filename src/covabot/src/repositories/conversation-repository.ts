/**
 * ConversationRepository - Data access layer for conversation history
 *
 * Provides a clean abstraction over conversation operations,
 * managing conversation storage, retrieval, and pruning of conversation records.
 * Uses PostgreSQL for persistent storage with parameterized queries.
 */

import { PostgresBaseRepository } from '@starbunk/shared';
import { PostgresService } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { ConversationRow, ConversationContext } from '@/models/memory-types';

const logger = logLayer.withPrefix('ConversationRepository');

export class ConversationRepository extends PostgresBaseRepository<ConversationRow> {
  constructor(pgService: PostgresService) {
    super(pgService);
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
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const span = this.tracing.startSpan('conversation.store', {
      'conversation.channel_id': channelId,
      'conversation.user_id': userId,
    });

    try {
      const result = await this.executeWithReturning<{ id: string }>(
        `INSERT INTO covabot_conversations
         (profile_id, channel_id, user_id, message_content, response_content, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [profileId, channelId, userId, messageContent, botResponse, JSON.stringify(metadata || {})],
      );

      const id = result?.id;

      if (!id) {
        const err = new Error('Failed to store conversation: no id returned from INSERT');
        logger
          .withError(err)
          .withMetadata({
            profile_id: profileId,
            channel_id: channelId,
            user_id: userId,
          })
          .error('Failed to store conversation: no id returned from INSERT');
        throw err;
      }

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
      'conversation.limit': limit,
    });

    try {
      const rows = await this.query<{
        user_id: string;
        message_content: string;
        response_content: string | null;
        created_at: Date;
      }>(
        `SELECT user_id, message_content, response_content, created_at
         FROM covabot_conversations
         WHERE profile_id = $1 AND channel_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [profileId, channelId, limit],
      );

      // Reverse to get chronological order
      const messages = rows.reverse().map(row => ({
        userId: row.user_id,
        userName: null, // userName removed from new schema
        content: row.message_content,
        botResponse: row.response_content,
        timestamp: new Date(row.created_at),
      }));

      logger
        .withMetadata({
          profile_id: profileId,
          channel_id: channelId,
          messages_count: messages.length,
        })
        .debug('Channel context retrieved');

      if (span) {
        span.setAttributes({
          'context.message_count': messages.length,
        });
      }

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
    const span = this.tracing.startSpan('conversation.getUserHistory', {
      'conversation.user_id': userId,
      'conversation.profile_id': profileId,
      'conversation.limit': limit,
    });

    try {
      const rows = await this.query<{
        user_id: string;
        message_content: string;
        response_content: string | null;
        created_at: Date;
      }>(
        `SELECT user_id, message_content, response_content, created_at
         FROM covabot_conversations
         WHERE profile_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [profileId, userId, limit],
      );

      const messages = rows.reverse().map(row => ({
        userId: row.user_id,
        userName: null,
        content: row.message_content,
        botResponse: row.response_content,
        timestamp: new Date(row.created_at),
      }));

      logger
        .withMetadata({
          profile_id: profileId,
          user_id: userId,
          messages_count: messages.length,
        })
        .debug('User history retrieved');

      if (span) {
        span.setAttributes({
          'context.message_count': messages.length,
        });
      }

      return { messages };
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Delete old conversations to implement TTL (30-day retention)
   */
  async deleteOldConversations(daysToKeep: number = 30): Promise<number> {
    const span = this.tracing.startSpan('conversation.deleteOld', {
      'conversation.days_to_keep': daysToKeep,
    });

    try {
      const deletedCount = await this.execute(
        `DELETE FROM covabot_conversations
         WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
        [daysToKeep],
      );

      logger
        .withMetadata({
          days_kept: daysToKeep,
          deleted_count: deletedCount,
        })
        .info('Old conversations deleted');

      if (span) {
        span.setAttributes({
          'db.deleted_count': deletedCount,
        });
      }

      return deletedCount;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  /**
   * Get conversation count for a profile (useful for metrics)
   */
  async getConversationCount(profileId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM covabot_conversations WHERE profile_id = $1`,
      [profileId],
    );

    return parseInt(result?.count || '0', 10);
  }
}
