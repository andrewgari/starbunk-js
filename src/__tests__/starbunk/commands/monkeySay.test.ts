import { createMockCommandInteraction } from '@/__tests__/mocks/discordMocks';
import monkeySayCommand from '@/starbunk/commands/monkeySay';
import webhookService from '@/webhooks/webhookService';
import { ChatInputCommandInteraction, GuildMember, TextChannel, User } from 'discord.js';

jest.mock('@/webhooks/webhookService');

describe('MonkeySay Command', () => {
	let mockInteraction: ChatInputCommandInteraction;
	const mockUser = {
		username: 'TestMonkey',
		displayAvatarURL: jest.fn().mockReturnValue('mock-avatar-url'),
		toString: () => `<@123456789>`
	} as unknown as Partial<User>;
	const mockMember = {
		nickname: 'NickMonkey',
		displayAvatarURL: jest.fn().mockReturnValue('mock-member-avatar-url'),
		toString: () => `<@123456789>`
	} as unknown as Partial<GuildMember>;
	const mockChannel = {
		id: 'mock-channel-id',
		toString: () => `<#123456789>`
	} as unknown as Partial<TextChannel>;

	beforeEach(() => {
		mockInteraction = {
			...createMockCommandInteraction(),
			channel: mockChannel as TextChannel
		} as ChatInputCommandInteraction;
		mockInteraction.options.get = jest.fn().mockImplementation((name: string) => {
			switch (name) {
				case 'user':
					return { user: mockUser, member: mockMember };
				case 'message':
					return { value: 'test message' };
				default:
					return null;
			}
		});
		jest.clearAllMocks();
	});

	it('should send message via webhook with nickname and member avatar', async () => {
		await monkeySayCommand.execute(mockInteraction);

		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			mockChannel,
			{
				username: 'NickMonkey',
				avatarURL: 'mock-member-avatar-url',
				content: 'test message',
				embeds: []
			}
		);
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Message sent!',
			ephemeral: true
		});
	});

	it('should use username if nickname is not available', async () => {
		const mockMemberNoNick = { ...mockMember, nickname: null };
		mockInteraction.options.get = jest.fn().mockImplementation((name: string) => {
			switch (name) {
				case 'user':
					return { user: mockUser, member: mockMemberNoNick };
				case 'message':
					return { value: 'test message' };
				default:
					return null;
			}
		});

		await monkeySayCommand.execute(mockInteraction);

		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			mockChannel,
			expect.objectContaining({
				username: 'TestMonkey'
			})
		);
	});

	it('should use user avatar if member avatar is not available', async () => {
		const mockMemberNoAvatar = {
			...mockMember,
			displayAvatarURL: jest.fn().mockReturnValue(null)
		};
		mockInteraction.options.get = jest.fn().mockImplementation((name: string) => {
			switch (name) {
				case 'user':
					return { user: mockUser, member: mockMemberNoAvatar };
				case 'message':
					return { value: 'test message' };
				default:
					return null;
			}
		});

		await monkeySayCommand.execute(mockInteraction);

		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			mockChannel,
			expect.objectContaining({
				avatarURL: 'mock-avatar-url'
			})
		);
	});

	it('should have correct command data', () => {
		expect(monkeySayCommand.data.name).toBe('monkeysay');
		expect(monkeySayCommand.data.description).toBe('monkeydo');
		expect(monkeySayCommand.data.default_member_permissions).toBe('8'); // Administrator permission
	});
});
