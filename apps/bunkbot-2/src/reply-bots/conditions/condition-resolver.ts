import * as Conditions from './conditions';
import { Message } from 'discord.js';

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
      return Conditions.and(...l.all_of.map(this.resolve));
    }
    if (l.any_of) {
      return Conditions.or(...l.any_of.map(this.resolve));
    }
    if (l.none_of) {
      return Conditions.not(Conditions.or(...l.none_of.map(this.resolve)));
    }

    const [key] = Object.keys(l);

    switch (key) {
      case 'contains_word':
        return Conditions.containsWord(l.contains_word!);
      case 'contains_phrase':
        return Conditions.containsPhrase(l.contains_phrase!);
      case 'matches_pattern':
        return l.matches_pattern ? Conditions.matchesPattern(l.matches_pattern) : () => false;
      case 'matches_regex':
        return l.matches_regex ? Conditions.matchesPattern(l.matches_regex) : () => false;
      case 'from_user':
        return Conditions.fromUser(l.from_user!);
      case 'with_chance':
        return Conditions.withChance(l.with_chance!);
      case 'always':
        return () => true;
      default:
        console.warn(`Unknown condition: ${key}`);
        return () => false;
    }
  }
}
