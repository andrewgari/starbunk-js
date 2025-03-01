import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

import { AVATAR_URL, BOT_NAME, TEST } from './macaroniBotModel';

import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';
import webhookService from '@/webhooks/webhookService';
import { Message, TextChannel, User } from 'discord.js';
import ReplyBot from '../../replyBot';
import createMacaroniBot from './macaroniBot';

// Mock the userID and formatUserMention
jest.mock('@/discord/userID', () => ({
	Venn: TEST.VENN_USER_ID
}));

jest.mock('@/utils/discordFormat', () => ({
	formatUserMention: jest.fn().mockImplementation((id) => `<@${id}>`)
}));

describe('MacaroniBot', () => {
	let macaroniBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		macaroniBot = createMacaroniBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			const identity = macaroniBot.getIdentity();
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			mockMessage.author = {
				...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
				bot: true
			} as User;
			mockMessage.content = TEST.MESSAGE.VENN;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "venn" with the full name correction', async () => {
			mockMessage.content = TEST.MESSAGE.VENN;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.VENN_CORRECTION
				})
			);
		});

		it('should respond to "VENN" (case insensitive)', async () => {
			mockMessage.content = TEST.MESSAGE.VENN_UPPERCASE;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.VENN_CORRECTION
				})
			);
		});

		it('should respond to "venn" in a sentence', async () => {
			mockMessage.content = TEST.MESSAGE.VENN_IN_SENTENCE;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: TEST.RESPONSE.VENN_CORRECTION
				})
			);
		});

		it('should respond to "macaroni" with a user mention', async () => {
			mockMessage.content = TEST.MESSAGE.MACARONI;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: `Are you trying to reach ${TEST.RESPONSE.MACARONI_MENTION}`
				})
			);
		});

		it('should respond to "MACARONI" (case insensitive)', async () => {
			mockMessage.content = TEST.MESSAGE.MACARONI_UPPERCASE;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: `Are you trying to reach ${TEST.RESPONSE.MACARONI_MENTION}`
				})
			);
		});

		it('should respond to "mac" (shortened form)', async () => {
			mockMessage.content = TEST.MESSAGE.MAC;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: `Are you trying to reach ${TEST.RESPONSE.MACARONI_MENTION}`
				})
			);
		});

		it('should respond to "pasta" (alternative term)', async () => {
			mockMessage.content = TEST.MESSAGE.PASTA;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: `Are you trying to reach ${TEST.RESPONSE.MACARONI_MENTION}`
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
