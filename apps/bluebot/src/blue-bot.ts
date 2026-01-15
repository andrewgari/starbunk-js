import { Client, Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { processMessageByStrategy } from '@/strategy/strategy-router';

export class BlueBot {
  constructor(private readonly client: Client) {}

  async start(): Promise<void> {
    this.client.on('messageCreate', async (message: Message) => {
      // Basic bot-loop safety: never respond to other bots or self
      if (message.author.bot) return;

      try {
        await processMessageByStrategy(message);
      } catch (error) {
        logger.error('Error handling message', error);
      }
    });
  }
}
