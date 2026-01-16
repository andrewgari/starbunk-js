import { Message, TextChannel } from 'discord.js';
import { BlueReplyStrategy } from '@/strategy/blue-reply-strategy';
import { BlueRequestStrategy } from '@/strategy/blue-request-strategy';

const strategies = [
	new BlueRequestStrategy(),
	new BlueReplyStrategy(),
];

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
