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
    test('should return the author\'s id when request is for "me"', () => {
      const message = createMockMessage('bluebot, say something nice about me', '123456789012345678');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('<@123456789012345678>');
    });

    test('should return the mentioned user\'s id when request is a user mention', () => {
      const message = createMockMessage('bluebot, say something nice about <@123456789012345678>');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('<@123456789012345678>');
    });

    test('should return the user\'s id when request is for a user by name', () => {
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

    test('should return the original string when user is not found', () => {
      const message = createMockMessage('bluebot, say something nice about bluebot');
      const friend = strategy.getFriendFromMessage(message as Message);
      expect(friend).toBe('bluebot');
    });
  });
});
