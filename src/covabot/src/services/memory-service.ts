/**
 * Memory Service - Manages conversation history and learned user facts
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import { ConversationContext, UserFact } from '@/models/memory-types';
import { ConversationRepository } from '@/repositories/conversation-repository';
import { UserFactRepository } from '@/repositories/user-fact-repository';

const logger = logLayer.withPrefix('MemoryService');

export class MemoryService {
  private conversationRepo: ConversationRepository;
  private userFactRepo: UserFactRepository;

  constructor(conversationRepo: ConversationRepository, userFactRepo: UserFactRepository) {
    this.conversationRepo = conversationRepo;
    this.userFactRepo = userFactRepo;
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
    return this.conversationRepo.storeConversation(
      profileId,
      channelId,
      userId,
      userName,
      messageContent,
      botResponse,
    );
  }

  /**
   * Get recent conversation context for a channel
   */
  getChannelContext(profileId: string, channelId: string, limit: number = 10): ConversationContext {
    return this.conversationRepo.getChannelContext(profileId, channelId, limit);
  }

  /**
   * Get conversation history with a specific user
   */
  getUserHistory(profileId: string, userId: string, limit: number = 20): ConversationContext {
    return this.conversationRepo.getUserHistory(profileId, userId, limit);
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
    this.userFactRepo.storeUserFact(userId, factType, factKey, confidence, profileId, factValue);

    logger
      .withMetadata({
        profile_id: profileId,
        user_id: userId,
        fact_type: factType,
        fact_key: factKey,
      })
      .debug('User fact stored');
  }

  /**
   * Get all facts about a user
   */
  getUserFacts(profileId: string, userId: string): UserFact[] {
    return this.userFactRepo.getUserFacts(userId);
  }

  /**
   * Get facts of a specific type for a user
   */
  getUserFactsByType(
    profileId: string,
    userId: string,
    factType: 'interest' | 'relationship' | 'preference',
  ): UserFact[] {
    return this.userFactRepo.getUserFactsByType(userId, factType);
  }

  /**
   * Delete old conversations to manage database size
   */
  pruneOldConversations(profileId: string, daysToKeep: number = 30): number {
    return this.conversationRepo.pruneOldConversations(profileId, daysToKeep);
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
