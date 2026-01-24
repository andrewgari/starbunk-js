import * as Conditions from '@/reply-bots/conditions/conditions';
import { Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { TriggerConditionMetadata } from '@/reply-bots/conditions/trigger';
import { BotStateManager } from '@/reply-bots/services/bot-state-manager';
import { getTraceService } from '@starbunk/shared/observability/trace-service';

export type Logic = {
  // Logical Operators (Recursive)
  all_of?: Logic[];
  any_of?: Logic[];
  none_of?: Logic[];

  // Condition Sensors (The actual checks)
  contains_word?: string;
  contains_phrase?: string;
  matches_pattern?: string;
  matches_regex?: string; // Alias for matches_pattern
  from_user?: string;
  with_chance?: number;
  always?: boolean;
};

export interface ResolvedCondition {
  condition: (message: Message) => boolean | Promise<boolean>;
  metadata: TriggerConditionMetadata;
}

export class ConditionResolver {
  public static resolve(logic: Logic, botName?: string): (message: Message) => boolean | Promise<boolean> {
    const resolved = this.resolveWithMetadata(logic, botName);
    return resolved.condition;
  }

  public static resolveWithMetadata(logic: Logic, botName?: string): ResolvedCondition {
    const l = logic as Logic;

    if (l.all_of) {
      logger.withMetadata({ conditions_count: l.all_of.length }).debug('Resolving all_of condition');
      const subConditions = l.all_of.map((subLogic) => ConditionResolver.resolve(subLogic, botName));
      return {
        condition: Conditions.and(...subConditions),
        metadata: {
          conditionType: 'all_of',
          conditionDetails: { count: l.all_of.length },
          description: `All of ${l.all_of.length} conditions must match`,
        },
      };
    }
    if (l.any_of) {
      logger.withMetadata({ conditions_count: l.any_of.length }).debug('Resolving any_of condition');
      const subConditions = l.any_of.map((subLogic) => ConditionResolver.resolve(subLogic, botName));
      return {
        condition: Conditions.or(...subConditions),
        metadata: {
          conditionType: 'any_of',
          conditionDetails: { count: l.any_of.length },
          description: `Any of ${l.any_of.length} conditions must match`,
        },
      };
    }
    if (l.none_of) {
      logger.withMetadata({ conditions_count: l.none_of.length }).debug('Resolving none_of condition');
      const subConditions = l.none_of.map((subLogic) => ConditionResolver.resolve(subLogic, botName));
      return {
        condition: Conditions.not(Conditions.or(...subConditions)),
        metadata: {
          conditionType: 'none_of',
          conditionDetails: { count: l.none_of.length },
          description: `None of ${l.none_of.length} conditions must match`,
        },
      };
    }

    const [key] = Object.keys(l);

    switch (key) {
      case 'contains_word':
        logger.withMetadata({ word: l.contains_word }).debug('Resolving contains_word condition');
        return {
          condition: Conditions.containsWord(l.contains_word!),
          metadata: {
            conditionType: 'contains_word',
            conditionDetails: { word: l.contains_word },
            description: `Message contains word: ${l.contains_word}`,
          },
        };
      case 'contains_phrase':
        logger.withMetadata({ phrase: l.contains_phrase }).debug('Resolving contains_phrase condition');
        return {
          condition: Conditions.containsPhrase(l.contains_phrase!),
          metadata: {
            conditionType: 'contains_phrase',
            conditionDetails: { phrase: l.contains_phrase },
            description: `Message contains phrase: ${l.contains_phrase}`,
          },
        };
      case 'matches_pattern':
        logger.withMetadata({ pattern: l.matches_pattern }).debug('Resolving matches_pattern condition');
        return {
          condition: l.matches_pattern ? Conditions.matchesPattern(l.matches_pattern) : () => false,
          metadata: {
            conditionType: 'matches_pattern',
            conditionDetails: { pattern: l.matches_pattern },
            description: `Message matches pattern: ${l.matches_pattern}`,
          },
        };
      case 'matches_regex':
        logger.withMetadata({ regex: l.matches_regex }).debug('Resolving matches_regex condition');
        return {
          condition: l.matches_regex ? Conditions.matchesPattern(l.matches_regex) : () => false,
          metadata: {
            conditionType: 'matches_regex',
            conditionDetails: { regex: l.matches_regex },
            description: `Message matches regex: ${l.matches_regex}`,
          },
        };
      case 'from_user':
        logger.withMetadata({ user_id: l.from_user }).debug('Resolving from_user condition');
        return {
          condition: Conditions.fromUser(l.from_user!),
          metadata: {
            conditionType: 'from_user',
            conditionDetails: { user_id: l.from_user },
            description: `Message from user: ${l.from_user}`,
          },
        };
      case 'with_chance':
        logger.withMetadata({ chance: l.with_chance }).debug('Resolving with_chance condition');
        
        // Check if bot has a frequency override
        let effectiveChance = l.with_chance!;
        if (botName) {
          const stateManager = BotStateManager.getInstance();
          const override = stateManager.getFrequency(botName);
          if (override !== undefined) {
            logger.withMetadata({
              bot_name: botName,
              yaml_chance: l.with_chance,
              override_chance: override,
            }).debug('Applying frequency override to with_chance condition');
            
            // Emit trace event for frequency override application
            const tracing = getTraceService('bunkbot');
            tracing.addEvent(null, 'frequency.override_applied', {
              'bot.name': botName,
              'frequency.yaml': l.with_chance,
              'frequency.override': override,
            });
            
            effectiveChance = override;
          }
        }
        
        return {
          condition: Conditions.withChance(effectiveChance),
          metadata: {
            conditionType: 'with_chance',
            conditionDetails: { chance: effectiveChance },
            description: `Random chance: ${effectiveChance}%`,
          },
        };
      case 'always':
        logger.debug('Resolving always condition');
        return {
          condition: () => true,
          metadata: {
            conditionType: 'always',
            description: 'Always triggers',
          },
        };
      default:
        logger.withMetadata({ condition_key: key }).warn(`Unknown condition type: ${key}`);
        return {
          condition: () => false,
          metadata: {
            conditionType: 'unknown',
            conditionDetails: { key },
            description: `Unknown condition type: ${key}`,
          },
        };
    }
  }
}
