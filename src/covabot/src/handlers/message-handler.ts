/**
 * Message Handler - Wire Discord events to services
 *
 * Orchestrates the full message processing pipeline:
 * 1. Decision service determines if/how to respond
 * 2. Memory service provides context
 * 3. LLM service generates response (if needed)
 * 4. Discord service sends response
 * 5. Memory records the interaction
 */

import { Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { BotIdentity } from '@starbunk/shared/types/bot-identity';
import { MemoryService } from '@/services/memory-service';
import { ResponseDecisionService, DecisionContext } from '@/services/response-decision-service';
import { LlmService } from '@/services/llm-service';
import { PersonalityService } from '@/services/personality-service';
import { SocialBatteryService, SocialBatteryConfig } from '@/services/social-battery-service';
import { CovaProfile, LlmContext } from '@/models/memory-types';

const logger = logLayer.withPrefix('MessageHandler');

export class MessageHandler {
  private profiles: Map<string, CovaProfile>;
  private memoryService: MemoryService;
  private decisionService: ResponseDecisionService;
  private llmService: LlmService;
  private personalityService: PersonalityService;
  private socialBatteryService: SocialBatteryService;

  constructor(
    profiles: Map<string, CovaProfile>,
    memoryService: MemoryService,
    decisionService: ResponseDecisionService,
    llmService: LlmService,
    personalityService: PersonalityService,
    socialBatteryService: SocialBatteryService,
  ) {
    this.profiles = profiles;
    this.memoryService = memoryService;
    this.decisionService = decisionService;
    this.llmService = llmService;
    this.personalityService = personalityService;
    this.socialBatteryService = socialBatteryService;
  }

  /**
   * Handle an incoming Discord message
   */
  async handleMessage(message: Message): Promise<void> {
    const startTime = Date.now();

    // Get bot user ID from Discord service
    const discordService = DiscordService.getInstance();
    const client = discordService.getClient();
    const botUserId = client.user?.id;

    if (!botUserId) {
      logger.warn('Bot user ID not available');
      return;
    }

    logger
      .withMetadata({
        message_id: message.id,
        channel_id: message.channelId,
        author_id: message.author.id,
        author_name: message.author.username,
        content_preview: message.content.substring(0, 50),
      })
      .debug('Processing message');

    // Process message for each loaded profile
    for (const profile of this.profiles.values()) {
      try {
        await this.processForProfile(profile, message, botUserId);
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            profile_id: profile.id,
            message_id: message.id,
          })
          .error('Error processing message for profile');
      }
    }

    const duration = Date.now() - startTime;
    logger
      .withMetadata({
        message_id: message.id,
        duration_ms: duration,
        profiles_count: this.profiles.size,
      })
      .debug('Message processing complete');
  }

  /**
   * Process a message for a specific profile
   */
  private async processForProfile(
    profile: CovaProfile,
    message: Message,
    botUserId: string,
  ): Promise<void> {
    // Step 1: Make response decision
    const ctx: DecisionContext = { profile, message, botUserId };
    const decision = await this.decisionService.shouldRespond(ctx);

    if (!decision.shouldRespond) {
      logger
        .withMetadata({
          profile_id: profile.id,
          reason: decision.reason,
        })
        .debug('Decided not to respond');
      return;
    }

    // Step 2: Get response content
    let responseContent: string;

    if (!decision.useLlm && decision.patternResponse) {
      // Use canned pattern response
      responseContent = decision.patternResponse;
    } else {
      // Generate LLM response
      const llmResponse = await this.generateLlmResponse(profile, message);

      if (llmResponse.shouldIgnore) {
        logger
          .withMetadata({
            profile_id: profile.id,
          })
          .debug('LLM decided to ignore');
        return;
      }

      responseContent = llmResponse.content;
    }

    // Step 3: Send response
    if (responseContent && responseContent.trim().length > 0) {
      await this.sendResponse(profile, message, responseContent);

      // Step 4: Record in memory
      await this.memoryService.storeConversation(
        profile.id,
        message.channelId,
        message.author.id,
        message.author.username,
        message.content,
        responseContent,
      );

      // Step 5: Update social battery
      const batteryConfig: SocialBatteryConfig = {
        maxMessages: profile.socialBattery.maxMessages,
        windowMinutes: profile.socialBattery.windowMinutes,
        cooldownSeconds: profile.socialBattery.cooldownSeconds,
      };
      await this.socialBatteryService.recordMessage(profile.id, message.channelId, batteryConfig);

      // Step 6: Analyze for personality evolution
      this.personalityService.analyzeForEvolution(profile.id, message.content, responseContent);

      logger
        .withMetadata({
          profile_id: profile.id,
          channel_id: message.channelId,
          response_length: responseContent.length,
          trigger: decision.triggerName,
          reason: decision.reason,
        })
        .info('Response sent');
    }
  }

  /**
   * Generate LLM response with full context
   */
  private async generateLlmResponse(
    profile: CovaProfile,
    message: Message,
  ): Promise<{ content: string; shouldIgnore: boolean }> {
    // Build context
    const context = await this.buildLlmContext(profile, message);

    // Generate response
    const response = await this.llmService.generateResponse(
      profile,
      context,
      message.content,
      message.author.username,
    );

    return {
      content: response.content,
      shouldIgnore: response.shouldIgnore,
    };
  }

  /**
   * Build full LLM context from memory
   */
  private async buildLlmContext(profile: CovaProfile, message: Message): Promise<LlmContext> {
    // Get conversation history
    const channelContext = await this.memoryService.getChannelContext(
      profile.id,
      message.channelId,
      8, // Last 8 messages
    );
    const conversationHistory = this.memoryService.formatContextForLlm(
      channelContext,
      profile.displayName,
    );

    // Get user facts
    const userFacts = await this.memoryService.getUserFacts(profile.id, message.author.id);
    const userFactsStr = this.memoryService.formatFactsForLlm(userFacts, message.author.username);

    // Get trait modifiers
    const traitModifiers = this.personalityService.getTraitModifiersForLlm(profile.id);

    return {
      systemPrompt: profile.personality.systemPrompt,
      conversationHistory,
      userFacts: userFactsStr,
      traitModifiers,
    };
  }

  /**
   * Send response via Discord webhook
   */
  private async sendResponse(
    profile: CovaProfile,
    message: Message,
    content: string,
  ): Promise<void> {
    const discordService = DiscordService.getInstance();

    // Build bot identity from profile
    const identity: BotIdentity = await this.resolveBotIdentity(profile, message);

    await discordService.sendMessageWithBotIdentity(message, identity, content);
  }

  /**
   * Resolve bot identity based on profile configuration
   */
  private async resolveBotIdentity(profile: CovaProfile, message: Message): Promise<BotIdentity> {
    const identity = profile.identity;

    switch (identity.type) {
      case 'static':
        return {
          botName: identity.botName || profile.displayName,
          avatarUrl: identity.avatarUrl || profile.avatarUrl || '',
        };

      case 'mimic':
        if (identity.as_member && message.guild) {
          const discordService = DiscordService.getInstance();
          return discordService.getBotIdentityFromDiscord(message.guild.id, identity.as_member);
        }
        // Fallback to profile defaults
        return {
          botName: profile.displayName,
          avatarUrl: profile.avatarUrl || '',
        };

      case 'random':
        // Pick random member from guild
        if (message.guild) {
          const members = message.guild.members.cache.filter(m => !m.user.bot).map(m => m);

          if (members.length > 0) {
            const randomMember = members[Math.floor(Math.random() * members.length)];
            return {
              botName: randomMember.nickname || randomMember.user.username,
              avatarUrl: randomMember.displayAvatarURL({ size: 256, extension: 'png' }),
            };
          }
        }
        // Fallback to profile defaults
        return {
          botName: profile.displayName,
          avatarUrl: profile.avatarUrl || '',
        };

      default:
        return {
          botName: profile.displayName,
          avatarUrl: profile.avatarUrl || '',
        };
    }
  }
}
