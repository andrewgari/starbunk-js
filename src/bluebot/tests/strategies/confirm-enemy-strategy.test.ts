import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmEnemyStrategy, MURDER_RESPONSE } from '../../src/strategy/confirm-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';
import { expectShouldRespond, expectShouldNotRespond, setupEnemyEnv } from '../helpers/test-utils';

describe('ConfirmEnemyStrategy', () => {
  const enemyUserId = '9999999999';
  const friendUserId = '123456789';
  const strategy = new ConfirmEnemyStrategy();
  let cleanupEnv: () => void;

  beforeEach(() => {
    cleanupEnv = setupEnemyEnv(enemyUserId);
  });

  afterEach(() => {
    cleanupEnv();
  });

  describe('Enemy user replies', () => {
    describe('Mean or hostile words', () => {
      test.each([
        ['fuck', 'fuck'],
        ['fucking', 'fucking annoying'],
        ['hate', 'I hate this bot'],
        ['die', 'just die already'],
        ['kill', 'kill this bot'],
        ['worst', 'worst bot ever'],
        ['shit', 'this is shit'],
        ['murder', 'murder the bot'],
        ['bot', 'stupid bot'],
        ['bots', 'I hate bots'],
        ['mom', 'your mom'],
      ])('should respond to "%s"', async (_keyword, messageContent) => {
        await expectShouldRespond(strategy, messageContent, true, { authorId: enemyUserId });
      });

      test('should reply with the navy seal copypasta', async () => {
        const message = createMockMessage({ content: 'fuck this bot', authorId: enemyUserId });
        const shouldRespond = await strategy.shouldRespond(message as Message);
        expect(shouldRespond).toBe(true);
        const result = await strategy.getResponse();
        expect(result).toBe(MURDER_RESPONSE);
      });
    });

    describe('Non-hostile messages', () => {
      test('should not respond when message is long and does not contain mean words', async () => {
        await expectShouldNotRespond(
          strategy,
          'This is a very long message that does not contain any mean words or confirmation phrases',
          { authorId: enemyUserId }
        );
      });

      test('should not respond when message is neutral and long', async () => {
        await expectShouldNotRespond(
          strategy,
          'I was thinking about the weather today and how nice it is',
          { authorId: enemyUserId }
        );
      });
    });
  });

  describe('Non-enemy user replies', () => {
    test('should not respond even with mean words', async () => {
      await expectShouldNotRespond(strategy, 'fuck this bot', { authorId: friendUserId });
    });

    test('should not respond even with confirmation phrases', async () => {
      await expectShouldNotRespond(strategy, 'blue', { authorId: friendUserId });
    });
  });
});
