import { TextChannel, WebhookClient } from 'discord.js';
import { WebhookService } from '../webhookService';
import { logger } from '../../services/logger';
import { MessageInfo } from '../types';

// Mock environment module
jest.mock('../../environment', () => ({
	discord: {
		WEBHOOK_URL: 'https://discord.com/api/webhooks/mock-webhook',
	},
	isProduction: false,
	isDebugMode: () => false
}));

describe('WebhookService', () => {
	let webhookService: WebhookService;
	let mockWebhookClient: Partial<WebhookClient>;
	let mockChannel: TextChannel;
	let mockWebhook: any;
  
	beforeEach(() => {
		// Mock webhook client
		mockWebhookClient = {
			send: jest.fn().mockResolvedValue(undefined)
		};
    
		// Mock webhook for channel
		mockWebhook = {
			name: 'test-bot-webhook',
			send: jest.fn().mockResolvedValue({})
		};
    
		// Mock collection wrapper
		const mockCollection = {
			first: jest.fn().mockReturnValue(mockWebhook),
			find: jest.fn().mockImplementation((finder) => {
				if (typeof finder === 'function') {
					return finder(mockWebhook) ? mockWebhook : undefined;
				}
				return mockWebhook;
			})
		};
		
		// Create mock channel
		mockChannel = {
			name: 'test-channel',
			id: 'channel123',
			toString: () => `<#channel123>`,
			fetchWebhooks: jest.fn().mockResolvedValue(mockCollection),
			createWebhook: jest.fn().mockResolvedValue(mockWebhook),
			// Fill in required properties to satisfy TypeScript
			guild: {} as any,
			client: {} as any,
			type: 0
		} as unknown as TextChannel;
    
		// Create webhook service with mocked dependencies
		webhookService = new WebhookService(logger);
		// Use unknown to bypass type checking for private properties
		(webhookService as unknown as { webhookClient: WebhookClient }).webhookClient = mockWebhookClient as WebhookClient;
		(webhookService as unknown as { _webhookAvailable: boolean })._webhookAvailable = true;
	});
  
	afterEach(() => {
		jest.clearAllMocks();
	});
  
	describe('writeMessage', () => {
		it('should validate and transform bot identities correctly', async () => {
			// Create a test message
			const messageInfo: MessageInfo = {
				content: 'Test message',
				botName: 'TestBot',
				avatarUrl: 'https://example.com/avatar.jpg'
			};
      
			// Call the method
			await webhookService.writeMessage(mockChannel, messageInfo);
      
			// Check webhook name format
			expect(mockChannel.fetchWebhooks).toHaveBeenCalled();
      
			// Check that the message was sent with properly transformed info
			expect(mockWebhook.send).toHaveBeenCalledWith(expect.objectContaining({
				username: 'TestBot',
				avatarURL: 'https://example.com/avatar.jpg',
				content: 'Test message'
			}));

			// Verify that the transformed properties were passed
			expect(mockWebhook.send).toHaveBeenCalledWith(
				expect.not.objectContaining({
					botName: expect.anything(),
					avatarUrl: expect.anything()
				})
			);
		});
    
		it('should create a unique webhook name based on the bot username', async () => {
			// Mock channel without existing webhook
			const channelWithoutWebhook = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockResolvedValue({
					first: jest.fn().mockReturnValue(null),
					find: jest.fn().mockReturnValue(null)
				})
			} as unknown as TextChannel;
      
			const messageInfo: MessageInfo = {
				content: 'Test message',
				botName: 'Very Long Bot Name With Spaces',
				avatarUrl: 'https://example.com/avatar.jpg'
			};
      
			await webhookService.writeMessage(channelWithoutWebhook, messageInfo);
      
			// Check that createWebhook was called with the expected parameters
			expect(channelWithoutWebhook.createWebhook).toHaveBeenCalled();
			// The webhook name should contain some form of the bot name
			const createWebhookCallArgs = (channelWithoutWebhook.createWebhook as jest.Mock).mock.calls[0][0];
			expect(createWebhookCallArgs.name).toContain('Very-Long-Bot-Name-With-Spaces-webhook'.substring(0, 32));
			expect(createWebhookCallArgs.avatar).toBe('https://example.com/avatar.jpg');
		});
    
		it('should handle missing bot identity fields with fallback values', async () => {
			// Message with incomplete identity
			const incompleteMessageInfo: MessageInfo = {
				content: 'Test message with incomplete identity',
				// Missing botName and avatarUrl
			};
      
			await webhookService.writeMessage(mockChannel, incompleteMessageInfo);
      
			// Check that fallback values were used
			expect(mockWebhook.send).toHaveBeenCalledWith(expect.objectContaining({
				username: 'Unknown Bot',
				content: 'Test message with incomplete identity'
			}));
			// Avatar URL should be provided
			expect(mockWebhook.send).toHaveBeenCalledWith(
				expect.objectContaining({
					avatarURL: expect.any(String)
				})
			);
		});
    
		it('should use the right bot identity even when multiple bots send messages', async () => {
			// Create mock webhooks for different bots
			const mockWebhooks = new Map();
			
			// Mock function to either return an existing webhook or undefined
			const mockFindWebhook = jest.fn().mockImplementation((finder) => {
				if (typeof finder === 'function') {
					// Check each webhook
					for (const webhook of mockWebhooks.values()) {
						if (finder(webhook)) {
							return webhook;
						}
					}
				}
				return undefined;
			});
			
			// Mock channel that creates unique webhooks for each bot
			const multiWebhookChannel = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockResolvedValue({
					first: jest.fn().mockReturnValue(null),
					find: mockFindWebhook
				}),
				createWebhook: jest.fn().mockImplementation((opts) => {
					const newWebhook = {
						name: opts.name,
						send: jest.fn().mockResolvedValue(undefined)
					};
					mockWebhooks.set(opts.name, newWebhook);
					return Promise.resolve(newWebhook);
				})
			} as unknown as TextChannel;
			
			// Send messages from two different bots
			const bot1Info: MessageInfo = {
				content: 'Message from Bot 1',
				botName: 'Bot1',
				avatarUrl: 'https://example.com/bot1.jpg'
			};
			
			const bot2Info: MessageInfo = {
				content: 'Message from Bot 2',
				botName: 'Bot2',
				avatarUrl: 'https://example.com/bot2.jpg'
			};
			
			// Send first message
			await webhookService.writeMessage(multiWebhookChannel, bot1Info);
			
			// Send second message
			await webhookService.writeMessage(multiWebhookChannel, bot2Info);
			
			// Verify that createWebhook was called twice with different names
			expect(multiWebhookChannel.createWebhook).toHaveBeenCalledTimes(2);
			
			// Verify that the webhooks were created with the right names
			expect(multiWebhookChannel.createWebhook).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Bot1-webhook'
				})
			);
			
			expect(multiWebhookChannel.createWebhook).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Bot2-webhook'
				})
			);
			
			// Get the created webhooks
			const bot1Webhook = mockWebhooks.get('Bot1-webhook');
			const bot2Webhook = mockWebhooks.get('Bot2-webhook');
			
			// Verify the webhooks received the right messages
			expect(bot1Webhook.send).toHaveBeenCalledWith(expect.objectContaining({
				username: 'Bot1',
				avatarURL: 'https://example.com/bot1.jpg',
				content: 'Message from Bot 1'
			}));
			
			expect(bot2Webhook.send).toHaveBeenCalledWith(expect.objectContaining({
				username: 'Bot2',
				avatarURL: 'https://example.com/bot2.jpg',
				content: 'Message from Bot 2'
			}));
		});
		
		it('should use the same webhook for identical bot names', async () => {
			// Create a tracking map for webhook creation
			const mockWebhooks = new Map();
			let createWebhookCount = 0;
			
			// Custom mock implementation that simulates persisting webhooks
			const persistentWebhookChannel = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockImplementation(() => {
					return Promise.resolve({
						first: jest.fn().mockReturnValue(null),
						find: (finder: any) => {
							if (typeof finder === 'function') {
								// Check each webhook
								for (const webhook of mockWebhooks.values()) {
									if (finder(webhook)) {
										return webhook;
									}
								}
							}
							return undefined;
						}
					});
				}),
				createWebhook: jest.fn().mockImplementation((opts) => {
					createWebhookCount++;
					const newWebhook = {
						name: opts.name,
						send: jest.fn().mockResolvedValue(undefined)
					};
					mockWebhooks.set(opts.name, newWebhook);
					return Promise.resolve(newWebhook);
				})
			} as unknown as TextChannel;
			
			// Send multiple messages from the same bot
			const botInfo: MessageInfo = {
				content: 'First message',
				botName: 'SameBot',
				avatarUrl: 'https://example.com/same-bot.jpg'
			};
			
			// Send first message
			await webhookService.writeMessage(persistentWebhookChannel, botInfo);
			
			// Send second message with the same bot identity
			await webhookService.writeMessage(persistentWebhookChannel, {
				...botInfo,
				content: 'Second message'
			});
			
			// Verify that createWebhook was called only once
			expect(createWebhookCount).toBe(1);
			
			// Get the created webhook
			const webhook = mockWebhooks.get('SameBot-webhook');
			
			// Verify the webhook received both messages
			expect(webhook.send).toHaveBeenCalledTimes(2);
			expect(webhook.send).toHaveBeenCalledWith(expect.objectContaining({
				content: 'First message'
			}));
			expect(webhook.send).toHaveBeenCalledWith(expect.objectContaining({
				content: 'Second message'
			}));
		});
	});
	
	describe('validateMessageInfo and ensureValidMessageInfo', () => {
		it('should validate message info correctly', () => {
			// Access private methods for testing
			const validateMessageInfo = (webhookService as unknown as { 
				validateMessageInfo: (info: any) => boolean; 
			}).validateMessageInfo.bind(webhookService);
			
			// Valid message info with botName/avatarUrl
			expect(validateMessageInfo({
				content: 'Valid message',
				botName: 'Bot',
				avatarUrl: 'https://example.com/avatar.jpg'
			})).toBe(true);
			
			// Valid message info with username/avatarURL
			expect(validateMessageInfo({
				content: 'Valid message',
				username: 'Bot',
				avatarURL: 'https://example.com/avatar.jpg'
			})).toBe(true);
			
			// Invalid - missing content
			expect(validateMessageInfo({
				botName: 'Bot',
				avatarUrl: 'https://example.com/avatar.jpg'
			})).toBe(false);
			
			// Invalid - missing name
			expect(validateMessageInfo({
				content: 'Missing name',
				avatarUrl: 'https://example.com/avatar.jpg'
			})).toBe(false);
			
			// Invalid - missing avatar
			expect(validateMessageInfo({
				content: 'Missing avatar',
				botName: 'Bot'
			})).toBe(false);
		});
		
		it('should ensure valid message info with fallbacks', () => {
			// Access private method for testing
			const ensureValidMessageInfo = (webhookService as unknown as { 
				ensureValidMessageInfo: (info: any) => MessageInfo; 
			}).ensureValidMessageInfo.bind(webhookService);
			
			// Test with missing values
			const fixed = ensureValidMessageInfo({
				// Missing all required fields
			});
			
			expect(fixed.content).toBe('No message content provided');
			expect(fixed.username).toBe('Unknown Bot');
			expect(fixed.avatarURL).toBeTruthy(); // Should have a default avatar URL
			
			// Test with partial values
			const partiallyFixed = ensureValidMessageInfo({
				content: 'Test content',
				// Missing name and avatar
			});
			
			expect(partiallyFixed.content).toBe('Test content'); // Should keep original content
			expect(partiallyFixed.username).toBe('Unknown Bot');
			expect(partiallyFixed.avatarURL).toBeTruthy();
		});
	});
});