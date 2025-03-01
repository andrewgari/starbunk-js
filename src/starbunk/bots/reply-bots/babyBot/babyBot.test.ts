import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

import { AVATAR_URL, BABY_RESPONSE, BOT_NAME, TEST } from './babyBotModel';

import { patchReplyBot } from "@/tests/helpers/replyBotHelper";
import { createMockGuildMember, createMockMessage } from "@/tests/mocks/discordMocks";
import { createMockWebhookService } from "@/tests/mocks/serviceMocks";
import { Message, TextChannel, User } from "discord.js";
import ReplyBot from "../../replyBot";
import createBabyBot from "./babyBot";

describe('BabyBot', () => {
	let babyBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage(TEST.USER_NAME);

		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		babyBot = createBabyBot(mockWebhookService);
		patchReplyBot(babyBot, mockWebhookService);
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			const identity = babyBot.getIdentity();
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.BABY;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "baby" as a standalone word', async () => {
			mockMessage.content = TEST.MESSAGE.BABY;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: BABY_RESPONSE
				})
			);
		});

		it('should respond to "baby" in a sentence', async () => {
			mockMessage.content = TEST.MESSAGE.BABY_IN_SENTENCE;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: BABY_RESPONSE
				})
			);
		});

		it('should respond to "BABY" (case insensitive)', async () => {
			mockMessage.content = TEST.MESSAGE.BABY_UPPERCASE;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: BABY_RESPONSE
				})
			);
		});

		it('should NOT respond to words containing "baby" as a substring', async () => {
			mockMessage.content = TEST.MESSAGE.BABY_AS_SUBSTRING;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			await babyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
