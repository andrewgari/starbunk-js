import { describe, test, expect, beforeEach } from 'vitest';
import { ConfirmEnemyStrategy, MURDER_RESPONSE } from '../../src/strategy/confirm-enemy-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('ConfirmEnemyStrategy', () => {
  const enemyUserId = '9999999999';
  const strategy = new ConfirmEnemyStrategy();

  beforeEach(() => {
    process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
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
        const message = createMockMessage(messageContent, enemyUserId);
        const result = await strategy.shouldRespond(message as Message);
        expect(result).toBe(true);
      });

      test('should reply with the navy seal copypasta', async () => {
        const message = createMockMessage('fuck this bot', enemyUserId);
        const shouldRespond = await strategy.shouldRespond(message as Message);
        expect(shouldRespond).toBe(true);
        const result = await strategy.getResponse();
        expect(result).toBe(MURDER_RESPONSE);
      });
    });

    describe('Non-hostile messages', () => {
      test('should not respond when message is long and does not contain mean words', async () => {
        const message = createMockMessage(
          'This is a very long message that does not contain any mean words or confirmation phrases',
          enemyUserId
        );
        const result = await strategy.shouldRespond(message as Message);
        expect(result).toBe(false);
      });

      test('should not respond when message is neutral and long', async () => {
        const message = createMockMessage(
          'I was thinking about the weather today and how nice it is',
          enemyUserId
        );
        const result = await strategy.shouldRespond(message as Message);
        expect(result).toBe(false);
      });
    });
  });

  describe('Non-enemy user replies', () => {
    const friendUserId = '123456789';

    test('should not respond even with mean words', async () => {
      const message = createMockMessage('fuck this bot', friendUserId);
      const result = await strategy.shouldRespond(message as Message);
      expect(result).toBe(false);
    });

    test('should not respond even with confirmation phrases', async () => {
      const message = createMockMessage('blue', friendUserId);
      const result = await strategy.shouldRespond(message as Message);
      expect(result).toBe(false);
    });
  });
});
