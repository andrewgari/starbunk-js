import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { Guild, Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import UserID from '../../../discord/userID';
import BananaBot, { BANANA_RESPONSES } from '../../../starbunk/bots/reply-bots/bananaBot';
import random from '../../../utils/random';

describe('BananaBot', () => {
	let bananaBot: BananaBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	const expectedMessageBase = {
		username: 'Venn',
		avatarURL: 'mock-avatar-url',
		embeds: []
	};

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		const mockMember = createMockGuildMember(UserID.Venn, 'Venn');
		mockMessage = {
			content: '',
			author: mockMember.user,
			channel: {
				id: 'mock-channel-id',
				guild: { id: 'mock-guild-id' } as unknown as Guild,
				type: 0,
				send: jest.fn()
			} as unknown as TextChannel,
			member: mockMember
		} as Message<boolean>;
		bananaBot = new BananaBot(mockWebhookService);

		// Patch the sendReply method for synchronous testing
		patchReplyBot(bananaBot, mockWebhookService);
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			mockMessage.author = { ...mockMessage.author, bot: true } as User;
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "banana"', async () => {
			mockMessage.content = 'banana';
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.any(String)
				})
			);
		});

		it('should respond with a valid banana response', async () => {
			mockMessage.content = 'banana';
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			const call = (mockWebhookService.writeMessage as jest.Mock).mock.calls[0][1];
			expect(BANANA_RESPONSES).toContain(call.content);
		});

		it('should respond to case-insensitive "BANANA"', async () => {
			mockMessage.content = 'BANANA';
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					...expectedMessageBase,
					content: expect.any(String)
				})
			);
		});

		it('should respond to "banana" within text', async () => {
			mockMessage.content = 'I love banana splits';
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalled();
		});

		describe('Venn-specific behavior', () => {
			beforeEach(() => {
				const mockMember = createMockGuildMember(UserID.Venn, 'Venn');
				mockMessage = {
					content: '',
					author: mockMember.user,
					channel: {
						id: 'mock-channel-id',
						guild: { id: 'mock-guild-id' } as unknown as Guild,
						type: 0,
						send: jest.fn()
					} as unknown as TextChannel,
					member: mockMember
				} as Message<boolean>;
			});

			it('should respond to Venn messages when within 5% chance', async () => {
				jest.spyOn(random, 'percentChance').mockReturnValue(true);
				mockMessage.content = 'hello world';
				await bananaBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).toHaveBeenCalled();
			});

			it('should not respond to Venn messages when outside 5% chance', async () => {
				jest.spyOn(random, 'percentChance').mockReturnValue(false);
				mockMessage.content = 'hello world';
				await bananaBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});

			it('should not trigger Venn-specific behavior for other users', async () => {
				const otherMember = createMockGuildMember('other-id', 'OtherUser');
				mockMessage.author = otherMember.user;
				jest.spyOn(random, 'percentChance').mockReturnValue(true);
				mockMessage.content = 'hello world';
				await bananaBot.handleMessage(mockMessage as Message<boolean>);
				expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
			});
		});

		it('should not respond to unrelated messages from non-Venn users', async () => {
			mockMessage.content = 'hello world';
			mockMessage.author = { username: 'some jabroni', bot: false, displayAvatarURL: () => 'mock-avatar-url' } as unknown as User;
			await bananaBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
