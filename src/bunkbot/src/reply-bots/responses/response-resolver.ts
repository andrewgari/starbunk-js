// apps/bunkbot/src/core/response-resolver.ts
import { Message } from 'discord.js';
import { logger } from '@starbunk/shared/observability/logger';

export class ResponseResolver {
  static async resolve(template: string, message: Message): Promise<string> {
    logger.debug('Resolving response template', {
      template_length: template.length,
      has_placeholders: template.includes('{'),
    });

    let response = template;

    // Logic for the {start} placeholder
    if (response.includes('{start}')) {
      const words = message.content.split(' ');
      // Take the first 3 words or the first 12 characters
      const startText = words.slice(0, 3).join(' ').substring(0, 15);
      response = response.replace('{start}', `***${startText}...***`);

      logger.debug('Replaced {start} placeholder', {
        original_text: message.content.substring(0, 50),
        start_text: startText,
      });
    }

    logger.debug('Response template resolved', {
      original_length: template.length,
      resolved_length: response.length,
    });

    return response;
  }
}
