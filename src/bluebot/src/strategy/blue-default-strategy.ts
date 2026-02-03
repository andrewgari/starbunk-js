import { Message } from 'discord.js';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';
import { logger } from '@/observability/logger';

export class DefaultStrategy extends SendAPIMessageStrategy {
  readonly name = 'DefaultStrategy';
  readonly priority = 100;

  private blueRegex = /\b(blue?|blue?bot|bl(o+)|azul|blau|bl(u+)|blew)\b/i;
  private currentMessage: Message | null = null;

  shouldTrigger(message: Message): Promise<boolean> {
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
      this.currentMessage = message;
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

  getResponse(): Promise<string> {
    const response = 'Did somebody say Blu?';
    logger
      .withMetadata({
        strategy_name: 'DefaultStrategy',
        response,
        message_id: this.currentMessage?.id,
      })
      .info('DefaultStrategy: Generating default response');
    return Promise.resolve(response);
  }
}
