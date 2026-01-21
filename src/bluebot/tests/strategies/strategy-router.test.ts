import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { processMessageByStrategy } from '../../src/strategy/strategy-router';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel, Client } from 'discord.js';
import { BlueRequestStrategy } from '../../src/strategy/blue-request-strategy';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';
import { DefaultStrategy } from '../../src/strategy/default-strategy';

describe('Strategy Router', () => {
	const requestStrategy = new BlueRequestStrategy();
	const replyStrategy = new BlueReplyStrategy();
  const defaultStrategy = new DefaultStrategy();

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	describe('how we determine the strategy to use', () => {
		test('that Requests take priority over Replies', async () => {
			let message = createMockMessage('blue');
			expect(await requestStrategy.shouldRespond(message as Message)).toBe(false);
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);

			vi.advanceTimersByTime(1 * 60 * 1000);
			message = createMockMessage('bluebot say something nice about me');
			expect(await requestStrategy.shouldRespond(message as Message)).toBe(true);
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);

			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledWith(
				`<@${ message.author?.id }>, I think you're pretty blue! :wink:`,
			);
		});

    test('that Replies take priority over Defaults while in the time window', async () => {
      const sendSpy = vi.fn();

      let message = createMockMessage('blue');
      (message.channel as TextChannel).send = sendSpy;
      // both are true
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);
      expect(await defaultStrategy.shouldRespond(message as Message)).toBe(true);
			await processMessageByStrategy(message as Message);
      // but we're not within the time window, so we go with the default
			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');

      vi.advanceTimersByTime(1 * 60 * 1000); // advance 1 minute
      message = createMockMessage('blue');
      (message.channel as TextChannel).send = sendSpy;
      // both are still true
      expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);
      expect(await defaultStrategy.shouldRespond(message as Message)).toBe(true);
      await processMessageByStrategy(message as Message);
      // now we're in the time window so we go with the reply
			expect(sendSpy).toHaveBeenCalledWith('Somebody definitely said Blu!');
    });
	});
});
