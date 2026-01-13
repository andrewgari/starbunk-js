import { Message } from 'discord.js';

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
  return regex.test(message.content);
};

// Scenario 1: Someone says a phrase (partial match)
export const containsPhrase = (phrase: string) => (message: Message) =>
  message.content.toLowerCase().includes(phrase.toLowerCase());

// Scenario 2: Message is from a specific user
export const fromUser = (userId: string) => (message: Message) =>
  message.author.id === userId;

// Scenario 3: Random Proc (Percent Chance)
export const withChance = (percent: number) => () =>
  Math.random() * 100 <= percent;

// Advanced: Regex Pattern matching
export const matchesPattern = (pattern: string) => (message: Message) => {
  const regex = new RegExp(pattern, 'i');
  return regex.test(message.content);
};
