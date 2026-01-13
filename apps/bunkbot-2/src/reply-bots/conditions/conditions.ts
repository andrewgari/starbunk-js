import { Message } from 'discord.js';
import { logger } from '@/observability/logger';

/**
 * Basic Logical Building Blocks
 */

// Logical AND: All conditions must pass
export const and = (...conditions: ((m: Message) => boolean | Promise<boolean>)[]) =>
  async (message: Message) => {
    for (const condition of conditions) {
      const result = condition(message);
      const isMatch = result instanceof Promise ? await result : result;
      if (!isMatch) return false;
    }
    return true;
  };

// Logical OR: At least one condition must pass
export const or = (...conditions: ((m: Message) => boolean | Promise<boolean>)[]) =>
  async (message: Message) => {
    for (const condition of conditions) {
      const result = condition(message);
      const isMatch = result instanceof Promise ? await result : result;
      if (isMatch) return true;
    }
    return false;
  };

// Logical NOT: Negate a condition
export const not = (condition: (m: Message) => boolean | Promise<boolean>) =>
  async (message: Message) => {
    const result = condition(message);
    const isMatch = result instanceof Promise ? await result : result;
    return !isMatch;
  };

/**
 * Specific Condition Sensors
 */

// Scenario 1: Someone says a specific word (exact match)
export const containsWord = (word: string) => (message: Message) => {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  const matches = regex.test(message.content);
  if (matches) {
    logger.debug('Condition matched: contains_word', {
      word,
      message_id: message.id,
      message_content: message.content.substring(0, 100),
    });
  }
  return matches;
};

// Scenario 1: Someone says a phrase (partial match)
export const containsPhrase = (phrase: string) => (message: Message) => {
  const matches = message.content.toLowerCase().includes(phrase.toLowerCase());
  if (matches) {
    logger.debug('Condition matched: contains_phrase', {
      phrase,
      message_id: message.id,
      message_content: message.content.substring(0, 100),
    });
  }
  return matches;
};

// Scenario 2: Message is from a specific user
export const fromUser = (userId: string) => (message: Message) => {
  const matches = message.author.id === userId;
  if (matches) {
    logger.debug('Condition matched: from_user', {
      user_id: userId,
      author_username: message.author.username,
      message_id: message.id,
    });
  }
  return matches;
};

// Scenario 3: Random Proc (Percent Chance)
export const withChance = (percent: number) => () => {
  const roll = Math.random() * 100;
  const matches = roll <= percent;
  if (matches) {
    logger.debug('Condition matched: with_chance', {
      percent,
      roll: roll.toFixed(2),
    });
  }
  return matches;
};

// Advanced: Regex Pattern matching
export const matchesPattern = (pattern: string) => (message: Message) => {
  const regex = new RegExp(pattern, 'i');
  const matches = regex.test(message.content);
  if (matches) {
    logger.debug('Condition matched: matches_pattern', {
      pattern,
      message_id: message.id,
      message_content: message.content.substring(0, 100),
    });
  }
  return matches;
};
