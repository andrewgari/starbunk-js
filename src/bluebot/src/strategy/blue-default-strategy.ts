import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { logger } from '@/observability/logger';

export class DefaultStrategy implements BlueStrategy {
  private blueRegex = /\b(blue?|blue?bot|bl(o+)|azul|blau|bl(u+)|blew)\b/i;

  shouldRespond(message: Message): Promise<boolean> {
    const matches = this.blueRegex.test(message.content);
    const matchedText = message.content.match(this.blueRegex)?.[0];

    logger
      .withMetadata({
        strategy_name: 'DefaultStrategy',
        matches,
        matched_text: matchedText,
        message_content: message.content,
        message_id: message.id,
      })
      .debug(`DefaultStrategy: Regex evaluation`);

    if (matches) {
      logger
        .withMetadata({
          strategy_name: 'DefaultStrategy',
          matched_text: matchedText,
          message_id: message.id,
        })
        .info('DefaultStrategy: Blue keyword detected');
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  getResponse(_message: Message): Promise<string> {
    const response = 'Did somebody say Blu?';
    logger
      .withMetadata({
        strategy_name: 'DefaultStrategy',
        response,
        message_id: _message.id,
      })
      .info('DefaultStrategy: Generating default response');
    return Promise.resolve(response);
  }
}
