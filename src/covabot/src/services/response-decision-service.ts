/**
 * Response Decision Service
 *
 * Flow: Hard Filters → Direct Mention → Social Battery → LLM
 *
 * The LLM receives rich context signals (including whether its name was mentioned)
 * and decides whether to engage via the IGNORE marker. No string-pattern gating.
 */

import { Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryService, SocialBatteryConfig } from './social-battery-service';
import { CovaProfile, ResponseDecision } from '@/models/memory-types';

const logger = logLayer.withPrefix('ResponseDecisionService');

const e2eAllowedBotIds = new Set(
  (process.env.E2E_ALLOWED_BOT_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
);

export interface DecisionContext {
  profile: CovaProfile;
  message: Message;
  botUserId: string;
}

export class ResponseDecisionService {
  private socialBatteryService: SocialBatteryService;

  constructor(socialBatteryService: SocialBatteryService) {
    this.socialBatteryService = socialBatteryService;
  }

  async shouldRespond(ctx: DecisionContext): Promise<ResponseDecision> {
    const { profile, message, botUserId } = ctx;

    logger
      .withMetadata({
        profile_id: profile.id,
        message_id: message.id,
        author_id: message.author.id,
      })
      .debug('Evaluating response decision');

    // Step 1: Hard filters — structural rejections that need no LLM input
    if (this.shouldIgnore(profile, message, botUserId)) {
      return { shouldRespond: false, reason: 'ignored' };
    }

    // Step 2: Direct @mention — bypass rate limits, the user explicitly addressed us
    if (this.isDirectMention(message, botUserId)) {
      logger.withMetadata({ profile_id: profile.id }).debug('Direct mention detected');
      return { shouldRespond: true, reason: 'direct_mention' };
    }

    // Step 3: Social battery ceiling — hard stop if we've been too chatty
    const batteryConfig: SocialBatteryConfig = {
      maxMessages: profile.socialBattery.maxMessages,
      windowMinutes: profile.socialBattery.windowMinutes,
      cooldownSeconds: profile.socialBattery.cooldownSeconds,
    };

    const batteryCheck = await this.socialBatteryService.canSpeak(
      profile.id,
      message.channelId,
      batteryConfig,
    );

    if (!batteryCheck.canSpeak) {
      logger
        .withMetadata({
          profile_id: profile.id,
          reason: batteryCheck.reason,
          current_count: batteryCheck.currentCount,
        })
        .debug('Social battery depleted');
      return { shouldRespond: false, reason: 'ignored' };
    }

    // Step 4: Everything else — LLM decides via IGNORE marker with full context signals
    logger.withMetadata({ profile_id: profile.id }).debug('Passing to LLM for engagement decision');
    return { shouldRespond: true, reason: 'llm_response' };
  }

  private shouldIgnore(profile: CovaProfile, message: Message, botUserId: string): boolean {
    if (message.author.id === botUserId) {
      logger.withMetadata({ profile_id: profile.id }).debug('Ignoring self-message');
      return true;
    }

    if (profile.ignoreBots && message.author.bot && !e2eAllowedBotIds.has(message.author.id)) {
      logger
        .withMetadata({ profile_id: profile.id, author_id: message.author.id })
        .debug('Ignoring bot message');
      return true;
    }

    if (!message.content || message.content.trim().length === 0) {
      logger.withMetadata({ profile_id: profile.id }).debug('Ignoring empty message');
      return true;
    }

    return false;
  }

  private isDirectMention(message: Message, botUserId: string): boolean {
    if (message.mentions.users.has(botUserId)) {
      return true;
    }
    const mentionPattern = new RegExp(`<@!?${botUserId}>`);
    return mentionPattern.test(message.content);
  }
}
