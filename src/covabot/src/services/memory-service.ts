/**
 * Memory Service - Manages conversation history and learned user facts
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import {
  ConversationRow,
  UserFactRow,
  ConversationContext,
  UserFact,
} from '@/models/memory-types';

const logger = logLayer.withPrefix('MemoryService');

export class MemoryService {
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
    const stmt = this.db.prepare(`
      SELECT user_id, user_name, message_content, bot_response, created_at
      FROM conversations
      WHERE profile_id = ? AND channel_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(profileId, channelId, limit) as Pick<
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
    const stmt = this.db.prepare(`
      SELECT user_id, user_name, message_content, bot_response, created_at
      FROM conversations
      WHERE profile_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(profileId, userId, limit) as Pick<
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
   * Store a learned fact about a user
   */
  storeUserFact(
    profileId: string,
    userId: string,
    factType: 'interest' | 'relationship' | 'preference',
    factKey: string,
    factValue: string,
    confidence: number = 1.0,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_facts (profile_id, user_id, fact_type, fact_key, fact_value, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, user_id, fact_type, fact_key)
      DO UPDATE SET fact_value = excluded.fact_value, confidence = excluded.confidence, learned_at = CURRENT_TIMESTAMP
    `);

    stmt.run(profileId, userId, factType, factKey, factValue, confidence);

    logger.withMetadata({
      profile_id: profileId,
      user_id: userId,
      fact_type: factType,
      fact_key: factKey,
    }).debug('User fact stored');
  }

  /**
   * Get all facts about a user
   */
  getUserFacts(profileId: string, userId: string): UserFact[] {
    const stmt = this.db.prepare(`
      SELECT fact_type, fact_key, fact_value, confidence
      FROM user_facts
      WHERE profile_id = ? AND user_id = ?
      ORDER BY confidence DESC
    `);

    const rows = stmt.all(profileId, userId) as Pick<
      UserFactRow,
      'fact_type' | 'fact_key' | 'fact_value' | 'confidence'
    >[];

    const facts = rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));

    logger.withMetadata({
      profile_id: profileId,
      user_id: userId,
      facts_count: facts.length,
    }).debug('User facts retrieved');

    return facts;
  }

  /**
   * Get facts of a specific type for a user
   */
  getUserFactsByType(
    profileId: string,
    userId: string,
    factType: 'interest' | 'relationship' | 'preference',
  ): UserFact[] {
    const stmt = this.db.prepare(`
      SELECT fact_type, fact_key, fact_value, confidence
      FROM user_facts
      WHERE profile_id = ? AND user_id = ? AND fact_type = ?
      ORDER BY confidence DESC
    `);

    const rows = stmt.all(profileId, userId, factType) as Pick<
      UserFactRow,
      'fact_type' | 'fact_key' | 'fact_value' | 'confidence'
    >[];

    return rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));
  }

  /**
   * Delete old conversations to manage database size
   */
  pruneOldConversations(profileId: string, daysToKeep: number = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM conversations
      WHERE profile_id = ?
        AND created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(profileId, daysToKeep);

    logger.withMetadata({
      profile_id: profileId,
      days_kept: daysToKeep,
      deleted_count: result.changes,
    }).info('Old conversations pruned');

    return result.changes;
  }

  /**
   * Format conversation context as a string for LLM
   */
  formatContextForLlm(context: ConversationContext, botName: string): string {
    if (context.messages.length === 0) {
      return '';
    }

    const lines = context.messages.map(msg => {
      const username = msg.userName || `User ${msg.userId.slice(-4)}`;
      let line = `${username}: ${msg.content}`;
      if (msg.botResponse) {
        line += `\n${botName}: ${msg.botResponse}`;
      }
      return line;
    });

    return lines.join('\n');
  }

  /**
   * Format user facts as a string for LLM context
   */
  formatFactsForLlm(facts: UserFact[], userName: string): string {
    if (facts.length === 0) {
      return '';
    }

    const sections: Record<string, string[]> = {
      interest: [],
      relationship: [],
      preference: [],
    };

    for (const fact of facts) {
      sections[fact.type].push(`${fact.key}: ${fact.value}`);
    }

    const lines: string[] = [];

    if (sections.interest.length > 0) {
      lines.push(`${userName}'s interests: ${sections.interest.join(', ')}`);
    }
    if (sections.relationship.length > 0) {
      lines.push(`Your relationship with ${userName}: ${sections.relationship.join(', ')}`);
    }
    if (sections.preference.length > 0) {
      lines.push(`${userName}'s preferences: ${sections.preference.join(', ')}`);
    }

    return lines.join('\n');
  }
}
