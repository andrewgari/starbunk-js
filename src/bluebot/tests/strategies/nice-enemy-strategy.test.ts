import { describe, test, expect, beforeEach } from 'vitest';
import { NiceEnemyStrategy } from '../../src/strategy/nice-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message, Client } from 'discord.js';
import { BlueBotDiscordService } from '../../src/discord/discord-service';

describe('NiceEnemyStrategy', () => {
	let strategy: NiceEnemyStrategy;

	beforeEach(() => {
		strategy = new NiceEnemyStrategy();
    process.env.BLUEBOT_ENEMY_USER_ID = '999999999999999999';
    process.env.GUILD_ID = '999999999999999999';
	});

	describe('how it responds to a request to say something nice about their enemy', () => {
    test('that it understands that the request is for the enemy using nickname', async () => {
      const content = 'Bluebot, say something nice about EnemyNickname';
      const message = createMockMessage(content, '111111111111111111', false, '999999999999999999', 'AuthorNickname');

      // Set up the BlueBotDiscordService with the mock client
      const discordService = BlueBotDiscordService.getInstance();
      discordService.setClient(message.client as Client);

      expect(await strategy.shouldRespond(message as Message)).toBe(true);
    });

    test('that it responds with the correct message when using user mention', async () => {
      const content = 'Bluebot, say something nice about <@999999999999999999>';
      const message = createMockMessage(content, '111111111111111111', false, '999999999999999999', 'AuthorNickname');

      // Set up the BlueBotDiscordService with the mock client
      const discordService = BlueBotDiscordService.getInstance();
      discordService.setClient(message.client as Client);

      expect(await strategy.getResponse(message as Message)).toBe('No way, they can suck my blue cane :unamused:');
    });
  });

});
