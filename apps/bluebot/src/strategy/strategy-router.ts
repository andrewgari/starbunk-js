import { Message, TextChannel } from 'discord.js';
import { DefaultStrategy } from './default-strategy';
import { ConfirmStrategy } from './confirm-strategy';
import { ConfirmEnemyStrategy } from './confirm-enemy-strategy';
import { NiceStrategy } from './nice-strategy';
import { NiceEnemyStrategy } from './nice-enemy-strategy';

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
