/**
 * Response Decision Service - Orchestrates hybrid response flow
 *
 * Flow: Basic Filters → Direct Mention → Pattern Trigger → Interest Check → Social Battery → LLM
 */

import { Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { InterestService } from './interest-service';
import { SocialBatteryService, SocialBatteryConfig } from './social-battery-service';
import { CovaProfile, ResponseDecision, TriggerCondition } from '@/models/memory-types';

const logger = logLayer.withPrefix('ResponseDecisionService');

export interface DecisionContext {
  profile: CovaProfile;
  message: Message;
  botUserId: string;
}

export class ResponseDecisionService {
  private interestService: InterestService;
  private socialBatteryService: SocialBatteryService;

  constructor(
    interestService: InterestService,
    socialBatteryService: SocialBatteryService,
  ) {
    this.interestService = interestService;
    this.socialBatteryService = socialBatteryService;
  }

  /**
   * Main decision flow - determines whether and how to respond
   */
  async shouldRespond(ctx: DecisionContext): Promise<ResponseDecision> {
    const { profile, message, botUserId } = ctx;

    logger.withMetadata({
      profile_id: profile.id,
      message_id: message.id,
      author_id: message.author.id,
    }).debug('Evaluating response decision');

    // Step 1: Basic filters
    if (this.shouldIgnore(profile, message, botUserId)) {
      return {
        shouldRespond: false,
        reason: 'ignored',
        useLlm: false,
      };
    }

    // Step 2: Direct @mention - always respond with LLM
    if (this.isDirectMention(message, botUserId)) {
      logger.withMetadata({ profile_id: profile.id }).debug('Direct mention detected');
      return {
        shouldRespond: true,
        reason: 'direct_mention',
        useLlm: true,
      };
    }

    // Step 3: Pattern triggers
    const triggerResult = await this.evaluateTriggers(profile, message);
    if (triggerResult) {
      return triggerResult;
    }

    // Step 4: Interest-based saliency check
    const interestResult = this.interestService.isInterested(
      profile.id,
      message.content,
      0.3, // threshold
    );

    if (!interestResult.interested) {
      // Random chime chance (low probability even when not interested)
      if (Math.random() < 0.02) { // 2% chance
        logger.withMetadata({ profile_id: profile.id }).debug('Random chime triggered');
        return {
          shouldRespond: true,
          reason: 'random_chime',
          useLlm: true,
          interestScore: interestResult.score,
        };
      }

      logger.withMetadata({
        profile_id: profile.id,
        interest_score: interestResult.score,
      }).debug('Interest score below threshold');

      return {
        shouldRespond: false,
        reason: 'ignored',
        useLlm: false,
        interestScore: interestResult.score,
      };
    }

    // Step 5: Social battery check
    const batteryConfig: SocialBatteryConfig = {
      maxMessages: profile.socialBattery.maxMessages,
      windowMinutes: profile.socialBattery.windowMinutes,
      cooldownSeconds: profile.socialBattery.cooldownSeconds,
    };

    const batteryCheck = this.socialBatteryService.canSpeak(
      profile.id,
      message.channelId,
      batteryConfig,
    );

    if (!batteryCheck.canSpeak) {
      logger.withMetadata({
        profile_id: profile.id,
        reason: batteryCheck.reason,
        current_count: batteryCheck.currentCount,
      }).debug('Social battery depleted');

      return {
        shouldRespond: false,
        reason: 'ignored',
        useLlm: false,
        interestScore: interestResult.score,
      };
    }

    // Passed all checks - respond with LLM
    logger.withMetadata({
      profile_id: profile.id,
      interest_score: interestResult.score,
    }).debug('Interest match - will respond');

    return {
      shouldRespond: true,
      reason: 'interest_match',
      useLlm: true,
      interestScore: interestResult.score,
    };
  }

  /**
   * Check basic ignore conditions
   */
  private shouldIgnore(profile: CovaProfile, message: Message, botUserId: string): boolean {
    // Ignore self
    if (message.author.id === botUserId) {
      return true;
    }

    // Ignore bots if configured
    if (profile.ignoreBots && message.author.bot) {
      return true;
    }

    // Ignore empty messages
    if (!message.content || message.content.trim().length === 0) {
      return true;
    }

    return false;
  }

  /**
   * Check if message is a direct @mention of the bot
   */
  private isDirectMention(message: Message, botUserId: string): boolean {
    // Check for @mention
    if (message.mentions.users.has(botUserId)) {
      return true;
    }

    // Check for mention pattern in content
    const mentionPattern = new RegExp(`<@!?${botUserId}>`);
    return mentionPattern.test(message.content);
  }

  /**
   * Evaluate profile triggers against the message
   */
  private async evaluateTriggers(
    profile: CovaProfile,
    message: Message,
  ): Promise<ResponseDecision | null> {
    for (const trigger of profile.triggers) {
      const matches = await this.evaluateCondition(trigger.conditions, message);

      if (matches) {
        // Check response chance if specified
        if (trigger.response_chance !== undefined && trigger.response_chance < 1) {
          if (Math.random() > trigger.response_chance) {
            continue; // Skip this trigger due to chance roll
          }
        }

        logger.withMetadata({
          profile_id: profile.id,
          trigger_name: trigger.name,
          use_llm: trigger.use_llm,
        }).debug('Trigger matched');

        // Get canned response if not using LLM
        let patternResponse: string | undefined;
        if (!trigger.use_llm && trigger.responses) {
          patternResponse = Array.isArray(trigger.responses)
            ? trigger.responses[Math.floor(Math.random() * trigger.responses.length)]
            : trigger.responses;
        }

        return {
          shouldRespond: true,
          reason: 'pattern_trigger',
          useLlm: trigger.use_llm,
          patternResponse,
          triggerName: trigger.name,
        };
      }
    }

    return null;
  }

  /**
   * Recursively evaluate a trigger condition
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    message: Message,
  ): Promise<boolean> {
    // Logical operators
    if (condition.all_of) {
      for (const sub of condition.all_of) {
        if (!(await this.evaluateCondition(sub, message))) {
          return false;
        }
      }
      return true;
    }

    if (condition.any_of) {
      for (const sub of condition.any_of) {
        if (await this.evaluateCondition(sub, message)) {
          return true;
        }
      }
      return false;
    }

    if (condition.none_of) {
      for (const sub of condition.none_of) {
        if (await this.evaluateCondition(sub, message)) {
          return false;
        }
      }
      return true;
    }

    // Condition sensors
    if (condition.always) {
      return true;
    }

    if (condition.matches_pattern) {
      const regex = new RegExp(condition.matches_pattern, 'i');
      return regex.test(message.content);
    }

    if (condition.contains_word) {
      const regex = new RegExp(`\\b${this.escapeRegex(condition.contains_word)}\\b`, 'i');
      return regex.test(message.content);
    }

    if (condition.contains_phrase) {
      return message.content.toLowerCase().includes(condition.contains_phrase.toLowerCase());
    }

    if (condition.from_user) {
      return message.author.id === condition.from_user;
    }

    if (condition.with_chance !== undefined) {
      return Math.random() < condition.with_chance;
    }

    return false;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
