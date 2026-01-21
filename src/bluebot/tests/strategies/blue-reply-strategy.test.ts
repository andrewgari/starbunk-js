import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';
import { createMockMessage } from '../helpers/mock-message';
import { MURDER_RESPONSE } from '../../src/strategy/confirm-enemy-strategy';
import { Message } from 'discord.js';

describe('BlueReplyStrategy', () => {
	let strategy: BlueReplyStrategy;
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
		strategy = new BlueReplyStrategy();
	});

  describe('how it keeps track of messages its posted', () => {
    test('that is records the last time it asked if somebody said blue', async () => {
      const message = createMockMessage('blue', friendUserId);
      await strategy.shouldRespond(message as Message);
      await strategy.getResponse(message as Message);
      expect(strategy.lastBlueResponseTime).toBeInstanceOf(Date);
    });

    test('that is clears the last blue response when somebody confirms that they said blue', async () => {
      let message = createMockMessage('blue', friendUserId);
      await strategy.shouldRespond(message as Message);
      await strategy.getResponse(message as Message);
      expect(strategy.lastBlueResponseTime).toBeInstanceOf(Date);

      // Advance time by 1 minute (within the 5-minute reply window)
      vi.advanceTimersByTime(60 * 1000);

      message = createMockMessage('yes', friendUserId);
      await strategy.shouldRespond(message as Message);
      await strategy.getResponse(message as Message);
      expect(strategy.lastBlueResponseTime).toEqual(new Date(0));
    });

    test('that it only murders once every 24 hours', async () => {
      let message = createMockMessage('blue', enemyUserId);
      let triggered = await strategy.shouldRespond(message as Message);
      let response = await strategy.getResponse(message as Message);
      expect(strategy.lastBlueResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastBlueResponseTime).not.toEqual(new Date(0));
      expect(response).toBe('Did somebody say Blu?');

      // advance one minute
      vi.advanceTimersByTime(1 * 60 * 1000);
      message = createMockMessage('fuck', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      response = await strategy.getResponse(message as Message);
      expect(strategy.lastMurderResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastMurderResponseTime).not.toEqual(new Date(0));
      expect(response).toBe(MURDER_RESPONSE);

      // advance one minute
      vi.advanceTimersByTime(1 * 60 * 1000);
      message = createMockMessage('fuck', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      // once it's said it's piece, it goes back to asking if they said blue
      expect(triggered).toBe(false);

      // advance 12 hours
      vi.advanceTimersByTime(12 * 60 * 60 * 1000);
      message = createMockMessage('blue', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      response = await strategy.getResponse(message as Message);
      // back to normal behavior
      expect(response).toBe('Did somebody say Blu?');
      expect(triggered).toBe(true);
      expect(strategy.lastBlueResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastMurderResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastBlueResponseTime).not.toEqual(new Date(0));
      expect(strategy.lastMurderResponseTime).not.toEqual(new Date(0));

      // advance one minute
      vi.advanceTimersByTime(1 * 60 * 1000);
      message = createMockMessage('fuck', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      response = await strategy.getResponse(message as Message);
      expect(triggered).toBe(true);

      expect(strategy.lastMurderResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastMurderResponseTime).not.toEqual(new Date(0));
      expect(response).not.toBe(MURDER_RESPONSE);

      // advance 24 hours
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);

      message = createMockMessage('blue', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      response = await strategy.getResponse(message as Message);
      expect(response).not.toBe(MURDER_RESPONSE);
      expect(triggered).toBe(true);
      expect(strategy.lastBlueResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastMurderResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastBlueResponseTime).not.toEqual(new Date(0));
      expect(strategy.lastMurderResponseTime).not.toEqual(new Date(0));

      // advance one minute
      vi.advanceTimersByTime(1 * 60 * 1000);
      message = createMockMessage('fuck', enemyUserId);
      triggered = await strategy.shouldRespond(message as Message);
      response = await strategy.getResponse(message as Message);
      expect(strategy.lastMurderResponseTime).toBeInstanceOf(Date);
      expect(strategy.lastMurderResponseTime).not.toEqual(new Date(0));
      expect(response).toBe(MURDER_RESPONSE);
      expect(triggered).toBe(true);
    });
  });


});
