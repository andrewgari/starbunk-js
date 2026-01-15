import * as Conditions from '@/reply-bots/conditions/conditions';
import { Message } from 'discord.js';
import { logger } from '@/observability/logger';

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
export class ConditionResolver {
  public static resolve(logic: Logic): (message: Message) => boolean | Promise<boolean> {
    const l = logic as Logic;

    if (l.all_of) {
      logger.debug('Resolving all_of condition', { conditions_count: l.all_of.length });
      return Conditions.and(...l.all_of.map((subLogic) => ConditionResolver.resolve(subLogic)));
    }
    if (l.any_of) {
      logger.debug('Resolving any_of condition', { conditions_count: l.any_of.length });
      return Conditions.or(...l.any_of.map((subLogic) => ConditionResolver.resolve(subLogic)));
    }
    if (l.none_of) {
      logger.debug('Resolving none_of condition', { conditions_count: l.none_of.length });
      return Conditions.not(Conditions.or(...l.none_of.map((subLogic) => ConditionResolver.resolve(subLogic))));
    }

    const [key] = Object.keys(l);

    switch (key) {
      case 'contains_word':
        logger.debug('Resolving contains_word condition', { word: l.contains_word });
        return Conditions.containsWord(l.contains_word!);
      case 'contains_phrase':
        logger.debug('Resolving contains_phrase condition', { phrase: l.contains_phrase });
        return Conditions.containsPhrase(l.contains_phrase!);
      case 'matches_pattern':
        logger.debug('Resolving matches_pattern condition', { pattern: l.matches_pattern });
        return l.matches_pattern ? Conditions.matchesPattern(l.matches_pattern) : () => false;
      case 'matches_regex':
        logger.debug('Resolving matches_regex condition', { regex: l.matches_regex });
        return l.matches_regex ? Conditions.matchesPattern(l.matches_regex) : () => false;
      case 'from_user':
        logger.debug('Resolving from_user condition', { user_id: l.from_user });
        return Conditions.fromUser(l.from_user!);
      case 'with_chance':
        logger.debug('Resolving with_chance condition', { chance: l.with_chance });
        return Conditions.withChance(l.with_chance!);
      case 'always':
        logger.debug('Resolving always condition');
        return () => true;
      default:
        logger.warn(`Unknown condition type: ${key}`, { condition_key: key });
        return () => false;
    }
  }
}
