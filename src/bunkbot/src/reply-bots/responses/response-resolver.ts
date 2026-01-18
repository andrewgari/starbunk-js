// apps/bunkbot/src/core/response-resolver.ts
import { Message } from 'discord.js';
import { logger } from '@/observability/logger';

export class ResponseResolver {
  static async resolve(template: string, message: Message): Promise<string> {
    logger.withMetadata({
      template_length: template.length,
      has_placeholders: template.includes('{'),
    }).debug('Resolving response template');

    let response = template;

    // Logic for the {start} placeholder
    if (response.includes('{start}')) {
      const words = message.content.split(' ');
      // Take the first 3 words or the first 12 characters
      const startText = words.slice(0, 3).join(' ').substring(0, 15);
      response = response.replace('{start}', `***${startText}...***`);

      logger.withMetadata({
        original_text: message.content.substring(0, 50),
        start_text: startText,
      }).debug('Replaced {start} placeholder');
    }

    // Logic for the {random:min-max:char} placeholder
    // Example: {random:2-20:e} repeats 'e' between 2-20 times
    // The "char" segment is limited to 1-32 characters and cannot contain "}"
    const MAX_RANDOM_REPEAT = 1000;
    const randomPattern = /\{random:(\d+)-(\d+):([^}]{1,32})\}/g;
    response = response.replace(randomPattern, (match, minStr, maxStr, char) => {
      const rawMin = parseInt(minStr, 10);
      const rawMax = parseInt(maxStr, 10);

      // Validate parsed numbers
      if (Number.isNaN(rawMin) || Number.isNaN(rawMax)) {
        logger.withMetadata({
          placeholder: match,
          raw_min: minStr,
          raw_max: maxStr,
        }).warn('Invalid {random} placeholder bounds; leaving placeholder unchanged');
        return match;
      }

      // Normalize range (swap if inverted) and ensure non-negative
      const rangeMin = Math.max(0, Math.min(rawMin, rawMax));
      const rangeMax = Math.max(0, Math.max(rawMin, rawMax));

      // Cap the maximum to prevent performance issues
      const cappedMax = Math.min(rangeMax, MAX_RANDOM_REPEAT);
      const cappedMin = Math.min(rangeMin, cappedMax);

      const count = Math.floor(Math.random() * (cappedMax - cappedMin + 1)) + cappedMin;
      const repeated = char.repeat(count);

      logger.withMetadata({
        placeholder: match,
        original_min: rawMin,
        original_max: rawMax,
        effective_min: cappedMin,
        effective_max: cappedMax,
        count,
        char,
      }).debug('Replaced {random} placeholder');

      return repeated;
    });

    // Logic for the {swap_message:word1:word2} placeholder
    // Swaps all occurrences of word1 with word2 and vice versa in the original message
    // Example: {swap_message:check:czech} in a message "check this" becomes "czech this"
    const swapPattern = /\{swap_message:([^:}]+):([^}]+)\}/g;
    response = response.replace(swapPattern, (match, word1, word2) => {
      if (!word1 || !word2) {
        logger.withMetadata({
          placeholder: match,
          word1,
          word2,
        }).warn('Invalid {swap_message} placeholder; leaving placeholder unchanged');
        return match;
      }

      const swappedMessage = ResponseResolver.swapWords(message.content, word1, word2);

      logger.withMetadata({
        placeholder: match,
        word1,
        word2,
        original_message: message.content.substring(0, 100),
        swapped_message: swappedMessage.substring(0, 100),
      }).debug('Replaced {swap_message} placeholder');

      return swappedMessage;
    });

    logger.withMetadata({
      original_length: template.length,
      resolved_length: response.length,
    }).debug('Response template resolved');

    return response;
  }

  /**
   * Swaps all occurrences of word1 with word2 and vice versa, preserving case.
   * Uses word boundaries to avoid partial matches.
   */
  private static swapWords(text: string, word1: string, word2: string): string {
    // Create a single regex that matches either word (case-insensitive, word boundaries)
    const combinedPattern = new RegExp(
      `\\b(${ResponseResolver.escapeRegex(word1)}|${ResponseResolver.escapeRegex(word2)})\\b`,
      'gi'
    );

    // Replace each match with its counterpart, preserving case
    return text.replace(combinedPattern, (match) => {
      const matchLower = match.toLowerCase();
      const word1Lower = word1.toLowerCase();

      if (matchLower === word1Lower) {
        // Matched word1, swap to word2
        return ResponseResolver.matchCase(match, word2);
      } else {
        // Matched word2, swap to word1
        return ResponseResolver.matchCase(match, word1);
      }
    });
  }

  /**
   * Escapes special regex characters in a string.
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Applies the case pattern from the source word to the target word.
   * - ALL CAPS -> ALL CAPS
   * - all lower -> all lower
   * - Capitalized -> Capitalized
   * - Otherwise -> target as-is
   */
  private static matchCase(source: string, target: string): string {
    if (source === source.toUpperCase()) {
      return target.toUpperCase();
    }
    if (source === source.toLowerCase()) {
      return target.toLowerCase();
    }
    if (source[0] === source[0].toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
    }
    return target;
  }
}
