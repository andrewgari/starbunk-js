import { Message, TextChannel } from 'discord.js';
import { DefaultStrategy } from '@/strategy/default-strategy';
import { ConfirmStrategy } from '@/strategy/confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/confirm-enemy-strategy';
import { NiceStrategy } from '@/strategy/nice-strategy';
import { NiceEnemyStrategy } from '@/strategy/nice-enemy-strategy';

const strategies = [
	new DefaultStrategy(),
	new ConfirmStrategy(),
	new ConfirmEnemyStrategy(),
	new NiceStrategy(),
	new NiceEnemyStrategy(),
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
