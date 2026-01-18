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

    logger.withMetadata({
      original_length: template.length,
      resolved_length: response.length,
    }).debug('Response template resolved');

    return response;
  }
}
