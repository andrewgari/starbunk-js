import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

import { AVATAR_URL, BOT_NAME, SPIDERMAN_CORRECTION, TEST } from './spiderBotModel';

import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createSpiderBot from './spiderBot';

describe('SpiderBot', () => {
	let spiderBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		spiderBot = createSpiderBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			const identity = spiderBot.getIdentity();
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.SPIDERMAN;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "spiderman" (no hyphen)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDERMAN;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: SPIDERMAN_CORRECTION
				})
			);
		});

		it('should respond to "Spiderman" (case insensitive)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDERMAN_UPPERCASE;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: SPIDERMAN_CORRECTION
				})
			);
		});

		it('should respond to "SPIDERMAN" (all caps)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDERMAN_ALL_CAPS;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: SPIDERMAN_CORRECTION
				})
			);
		});

		it('should respond to "spider man" (with space instead of hyphen)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDER_MAN_WITH_SPACE;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: SPIDERMAN_CORRECTION
				})
			);
		});

		it('should respond when "spiderman" is part of a sentence', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDERMAN_IN_SENTENCE;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: SPIDERMAN_CORRECTION
				})
			);
		});

		it('should respond to "spider-man" (correct hyphenation)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDER_MAN_WITH_HYPHEN;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "Spider-Man" (correct hyphenation, case insensitive)', async () => {
			mockMessage.content = TEST.MESSAGE.SPIDER_MAN_WITH_HYPHEN_CAPS;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			await spiderBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
