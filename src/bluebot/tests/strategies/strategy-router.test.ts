import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { processMessageByStrategy } from '../../src/strategy/strategy-router';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel } from 'discord.js';
import { setupEnemyEnv, setupDiscordService } from '../helpers/test-utils';

describe('Strategy Router', () => {
  const enemyUserId = '999999999999999999';
  const friendUserId = '111111111111111111';
  let cleanupEnv: () => void;

  beforeEach(() => {
    cleanupEnv = setupEnemyEnv(enemyUserId);
  });

  afterEach(() => {
    cleanupEnv();
  });

  test('should prioritize enemy insult over compliment request', async () => {
    const message = createMockMessage({
      content: 'bluebot say something nice about EnemyNickname',
      authorId: friendUserId,
    });
    setupDiscordService(message);
    const sendSpy = vi.fn();
    (message.channel as TextChannel).send = sendSpy;

    await processMessageByStrategy(message as Message);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith('No way, they can suck my blue cane :unamused:');
  });

  test('should respond with compliment for friendly request', async () => {
    const message = createMockMessage({
      content: 'bluebot say something nice about FriendNickname',
      authorId: friendUserId,
    });
    setupDiscordService(message);
    const sendSpy = vi.fn();
    (message.channel as TextChannel).send = sendSpy;

    await processMessageByStrategy(message as Message);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      `<@222222222222222222>, I think you're pretty blue! :wink:`,
    );
  });
});
