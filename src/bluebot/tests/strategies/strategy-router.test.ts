import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { processMessageByStrategy, resetStrategies } from '../../src/strategy/strategy-router';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel } from 'discord.js';
import { DefaultStrategy } from '../../src/strategy/blue-default-strategy';
import { BlueRequestStrategy } from '../../src/strategy/blue-request-strategy';
import { BlueReplyStrategy } from '../../src/strategy/blue-reply-strategy';
import { beforeEach } from 'node:test';

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

	describe('Strategy priority', async () => {
		beforeEach(async () => {
			resetStrategies();
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.setSystemTime(new Date());

			const message = createMockMessage({ content: 'blue' });
			expect(await requestStrategy.shouldRespond(message as Message)).toBe(false);
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);
			expect(await defaultStrategy.shouldRespond(message as Message)).toBe(true);
			vi.advanceTimersByTime(1 * 60 * 1000);
		});

		test('should prioritize requests over replies', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about me' });
      const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;
			expect(await requestStrategy.shouldRespond(message as Message)).toBe(true);
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledWith(`<@${message.author?.id}>, I think you're pretty blue! :wink:`);
		});

		test('should prioritize replies over defaults within the time window', async () => {
      // blue number two
			let message = createMockMessage({ content: 'blue' });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;
			// both are true
			expect(await replyStrategy.shouldRespond(message as Message)).toBe(true);
			await processMessageByStrategy(message as Message);
			// but we're not within the time window, so we go with the default
			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');

			vi.advanceTimersByTime(1 * 60 * 1000); // advance 1 minute
			message = createMockMessage({ content: 'blue' });
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
