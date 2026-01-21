import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { NiceStrategy } from '../../src/strategy/nice-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { Message } from 'discord.js';

describe('NiceStrategy', () => {
	let strategy: NiceStrategy;

	beforeEach(() => {
		strategy = new NiceStrategy();
	});

  describe('getFriendFromMessage', () => {
    test('if the request is for me, it returns the authors id', () => {
      const message = createMockMessage('bluebot, say something nice about me', '123456789012345678');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('<@123456789012345678>');
    });

    test('if the request is for a user mention, it returns the mentioned users id', () => {
      const message = createMockMessage('bluebot, say something nice about <@123456789012345678>');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('<@123456789012345678>');
    });

    test('if the request is for a user by name, it returns the mentioned users id', () => {
      const additionalMembers = [
        {
          userId: '123456789012345678',
          nickname: 'TestNickname',
          username: 'TestUser',
        },
      ];
      const message = createMockMessage('bluebot, say something nice about TestNickname', '111111111111111111', false, '999999999999999999', 'AuthorNickname', additionalMembers);
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('<@123456789012345678>');
    });

    test('if the request is not a name, or cannot be found, it returns the original string', () => {
      const message = createMockMessage('bluebot, say something nice about bluebot');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('bluebot');
    });
  });
});
