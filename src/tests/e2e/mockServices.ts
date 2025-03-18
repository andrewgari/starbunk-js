/**
 * Comprehensive mocks for all required services in e2e tests
 */

import { Guild, GuildMember, TextChannel, WebhookClient } from 'discord.js';
import { container, Logger, ServiceId, WebhookService } from '../../services/services';
import { BotIdentity } from '../../starbunk/bots/botIdentity';
import { MessageInfo } from '../../webhooks/types';
import { discordMock } from './setup';

/**
 * Mock Logger implementation
 */
export class MockLogger implements Logger {
	debug = jest.fn();
	info = jest.fn();
	warn = jest.fn();
	error = jest.fn();
	success = jest.fn();
	formatMessage = jest.fn((message: string) => message);
}

/**
 * Mock WebhookService implementation
 */
export class MockWebhookService implements WebhookService {
	webhookClient: WebhookClient | null = null;
	logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	writeMessage = jest.fn().mockImplementation((channel: TextChannel, messageInfo: MessageInfo) => {
		// Capture the message in the discord mock
		discordMock.mockWebhookSend(
			messageInfo.username || 'TestBot',
			messageInfo.content,
			channel.name
		);
		return Promise.resolve();
	});

	sendMessage = jest.fn().mockImplementation((messageInfo: MessageInfo) => {
		this.logger.info(`Mock sending message: ${messageInfo.content}`);
		return Promise.resolve();
	});
}

/**
 * Mock GuildMemberIdentity helper functions
 */
export function mockGuildMemberHelper() {
	// Create a mock for getCurrentMemberIdentity
	const getCurrentMemberIdentity = jest.fn().mockImplementation(
		async (userId: string, guild: Guild): Promise<BotIdentity | undefined> => {
			const mockUser = discordMock.users.get(userId);
			if (mockUser) {
				return {
					userId: mockUser.id,
					avatarUrl: 'https://example.com/avatar.png',
					botName: mockUser.displayName
				};
			}
			return undefined;
		}
	);

	// Create a mock for getRandomMemberExcept
	const getRandomMemberExcept = jest.fn().mockImplementation(
		async (guild: Guild, excludeUserId: string): Promise<GuildMember | null> => {
			const members = guild.members.cache;
			const eligibleMembers = Array.from(members.values())
				.filter(member => !member.user.bot && member.id !== excludeUserId);

			if (eligibleMembers.length === 0) return null;

			const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
			return eligibleMembers[randomIndex];
		}
	);

	// Return the mock functions
	return {
		getCurrentMemberIdentity,
		getRandomMemberExcept
	};
}

/**
 * Setup all mock services for e2e tests
 */
export function setupMockServices(): void {
	// Clear the container first
	container.clear();

	// Create mock instances
	const logger = new MockLogger();
	const webhookService = new MockWebhookService(logger);

	// Register mock services
	container.register(ServiceId.Logger, logger);
	container.register(ServiceId.WebhookService, webhookService);
	container.register(ServiceId.DiscordClient, discordMock.client);

	// For any bot services, we'll register them as needed in tests
}
