import { Client, Message, TextChannel, User } from 'discord.js';
import { MessageInfo } from '../../../discord/messageInfo';
import { IWebhookService } from '../../../webhooks/webhookService';

// Mock WebhookService
export class MockWebhookService implements IWebhookService {
	messages: Array<{ channel?: TextChannel; message: MessageInfo }> = [];

	async sendMessage(message: MessageInfo): Promise<void> {
		this.messages.push({ message });
	}

	async writeMessage(channel: TextChannel, message: MessageInfo): Promise<void> {
		this.messages.push({ channel, message });
	}

	clear(): void {
		this.messages = [];
	}

	getLastMessage(): MessageInfo | undefined {
		return this.messages[this.messages.length - 1]?.message;
	}
}

// Create a mock Discord message
export function createMockMessage(content: string, userId?: string, isBot = false): Message {
	const mockUser = {
		bot: isBot,
		id: userId || '123',
		tag: 'test#1234',
		username: 'test',
		displayAvatarURL: () => 'https://example.com/avatar.png'
	} as User;

	const mockClient = {
		user: {
			id: '456'
		}
	} as Client;

	const mockChannel = {
		id: '789',
		name: 'test-channel',
		send: jest.fn(),
		type: 0
	} as unknown as TextChannel;

	return {
		content,
		author: mockUser,
		client: mockClient,
		channel: mockChannel,
		createdTimestamp: Date.now(),
		id: '999',
		_cacheType: 0,
		_patch: jest.fn(),
		delete: jest.fn(),
		edit: jest.fn(),
		fetch: jest.fn(),
		reply: jest.fn(),
		react: jest.fn(),
		pin: jest.fn(),
		unpin: jest.fn()
	} as unknown as Message;
}

// Setup test container with mocks
export function setupTestContainer(): void {
	// Clear the container first
	jest.resetModules();
}

// Setup common bot mocks
export function setupBotMocks(): void {
	// Mock Date.now() if needed
	jest.spyOn(Date, 'now').mockImplementation(() => 1625097600000); // Fixed timestamp
}

// Helper to verify webhook service was called with the right parameters
export function expectWebhookCalledWith(webhookService: MockWebhookService, botName: string, content: string): void {
	expect(webhookService.writeMessage).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			username: botName,
			content
		})
	);
}
