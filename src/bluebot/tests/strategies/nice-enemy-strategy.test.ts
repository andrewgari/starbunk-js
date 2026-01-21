import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NiceEnemyStrategy } from '../../src/strategy/nice-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';
import { setupEnemyEnv, setupDiscordService, expectResponse } from '../helpers/test-utils';

describe('NiceEnemyStrategy', () => {
	let strategy: NiceEnemyStrategy;
	let cleanupEnv: () => void;
	const enemyUserId = '999999999999999999';
	const guildId = '999999999999999999';

	beforeEach(() => {
		strategy = new NiceEnemyStrategy();
		cleanupEnv = setupEnemyEnv(enemyUserId, guildId);
	});

	afterEach(() => {
		cleanupEnv();
	});

	describe('Requests to say something nice about the enemy', () => {
    test('should recognize request for the enemy using nickname', async () => {
      const message = createMockMessage({
				content: 'Bluebot, say something nice about EnemyNickname',
				authorId: '111111111111111111',
				guildId,
				nickname: 'AuthorNickname',
			});

      setupDiscordService(message);

      expect(await strategy.shouldRespond(message as Message)).toBe(true);
    });

    test('should respond with insult when using user mention', async () => {
      const message = createMockMessage({
				content: 'Bluebot, say something nice about <@999999999999999999>',
				authorId: '111111111111111111',
				guildId,
				nickname: 'AuthorNickname',
			});

      setupDiscordService(message);

      await expectResponse(strategy, message as Message, 'No way, they can suck my blue cane :unamused:');
    });
  });

});
