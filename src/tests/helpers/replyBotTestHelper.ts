import { Guild, GuildMember, Message, TextChannel, User } from 'discord.js';
import { MessageInfo } from '../../discord/messageInfo';
import { BotIdentity, ResponseGenerator, TriggerCondition } from '../../starbunk/bots/botTypes';
import { WebhookService } from '../../webhooks/webhookService';

export interface MockBotComponents {
	identity: BotIdentity;
	trigger: TriggerCondition;
	responseGenerator: ResponseGenerator;
}

export function createMockIdentity(name: string = 'TestBot', avatarUrl: string = 'test-url'): BotIdentity {
	return { name, avatarUrl };
}

export function createMockTrigger(shouldTrigger: boolean = true): TriggerCondition {
	return {
		shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
	};
}

export function createMockResponseGenerator(response: string = 'test response'): ResponseGenerator {
	return {
		generateResponse: jest.fn().mockResolvedValue(response)
	};
}

export function createMockWebhookService(): Partial<WebhookService> {
	return {
		writeMessage: jest.fn().mockResolvedValue(undefined),
		getWebhookName: jest.fn().mockReturnValue('test-webhook'),
		getChannelWebhook: jest.fn().mockResolvedValue(undefined),
		getWebhook: jest.fn().mockResolvedValue(undefined)
	};
}

export function createMockGuildMember(id: string = 'test-member'): GuildMember {
	return {
		id,
		nickname: 'Test Nickname',
		displayName: 'Test Display Name',
		avatarURL: () => 'test-avatar-url',
		displayAvatarURL: () => 'test-display-avatar-url',
		toString: () => `<@${id}>`
	} as GuildMember;
}

export function createMockMessage(
	username: string = 'TestUser',
	content: string = '',
	isBot: boolean = false,
	memberId: string = 'test-member'
): Partial<Message> {
	const mockGuild = {
		id: 'test-guild',
		members: {
			fetch: jest.fn().mockResolvedValue(createMockGuildMember(memberId))
		}
	} as unknown as Guild;

	const mockUser = {
		username,
		bot: isBot,
		id: memberId,
		discriminator: '0000',
		system: false,
		flags: { bitfield: 0 },
		createdTimestamp: Date.now(),
		tag: `${username}#0000`,
		toString: () => `<@${memberId}>`
	} as User;

	return {
		content,
		author: mockUser,
		channel: {
			id: 'test-channel',
			type: 0
		} as TextChannel,
		guild: mockGuild,
		valueOf: () => 'test-message'
	};
}

export function getExpectedMessageOptions(
	botName: string,
	avatarUrl: string,
	content: string
): MessageInfo {
	return {
		username: botName,
		avatarURL: avatarUrl,
		content,
		embeds: []
	};
}
