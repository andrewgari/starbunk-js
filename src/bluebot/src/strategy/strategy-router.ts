import { Message, TextChannel } from 'discord.js';
import { BaseBlueStrategy } from '@/strategy/blue-strategy-impl';
import { BlueRequestStrategy } from '@/strategy/blue-request-strategy';

const blueRequestStrategy = new BlueRequestStrategy();
const blueReplyStrategy = new BaseBlueStrategy();

const strategies = [
	blueRequestStrategy,
	blueReplyStrategy,
];

/**
 * Reset all strategy state - useful for testing
 */
export function resetStrategies(): void {
	blueReplyStrategy.reset();
}

/**
 * Get the response for a message without sending it to Discord
 * Useful for testing and debugging
 */
export async function getResponseForMessage(message: Message): Promise<string | null> {
  for (const strategy of strategies) {
    if (await strategy.shouldRespond(message)) {
      const response = await strategy.getResponse(message);
      if (response) {
        return response;
      }
    }
  }
  return null;
}

export async function processMessageByStrategy(message: Message): Promise<void> {
  for (const strategy of strategies) {
    if (await strategy.shouldRespond(message)) {
      const response = await strategy.getResponse(message);

      if (response) {
        if (message.channel instanceof TextChannel) {
          await message.channel.send(response);
          return;
        }
      }
    }
  }
}
