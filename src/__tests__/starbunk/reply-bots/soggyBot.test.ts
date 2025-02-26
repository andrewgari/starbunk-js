import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockGuildMember, createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import roleIDs from '@/discord/roleIDs';
import SoggyBot from '@/starbunk/bots/reply-bots/soggyBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Collection, GuildMember, GuildMemberRoleManager, Message, Role, TextChannel, User } from 'discord.js';

const createMockMemberWithRoles = (roles: string[] = []): GuildMember => ({
	...createMockGuildMember('user-id', 'TestUser'),
	roles: {
		cache: new Collection<string, Role>(roles.map(id => [id, { id } as Role])),
		add: jest.fn(),
		remove: jest.fn(),
		set: jest.fn(),
		some: (predicate: (role: Role) => boolean) => roles.some(id => predicate({ id } as Role))
	} as unknown as GuildMemberRoleManager,
	toString: () => `<@${123}>`,
	_roles: []
} as unknown as GuildMember);

describe('SoggyBot', () => {
	let soggyBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('TestUser'),
			member: createMockMemberWithRoles()
		};
		soggyBot = new SoggyBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(soggyBot, mockWebhookService);
	});

	describe('message handling', () => {
		const expectedMessageOptions = {
			username: 'SoggyBot',
			avatarURL: 'https://imgur.com/OCB6i4x.jpg',
			content: 'Sounds like somebody enjoys wet bread',
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			await soggyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "wet bread" from users with WetBread role', async () => {
			mockMessage.content = 'wet bread';
			mockMessage = {
				...mockMessage,
				member: createMockMemberWithRoles([roleIDs.WetBread])
			};

			await soggyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expectedMessageOptions
			);
		});

		it('should not respond to "wet bread" from users without WetBread role', async () => {
			mockMessage.content = 'wet bread';
			mockMessage = {
				...mockMessage,
				member: createMockMemberWithRoles([])
			};

			await soggyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should not respond to unrelated messages', async () => {
			mockMessage.content = 'hello world';
			await soggyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
