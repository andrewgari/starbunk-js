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

    logger.withMetadata({
      original_length: template.length,
      resolved_length: response.length,
    }).debug('Response template resolved');

    return response;
  }
}
