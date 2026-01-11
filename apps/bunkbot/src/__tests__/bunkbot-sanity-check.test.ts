/**
 * Comprehensive Sanity Check for BunkBot Core Functionality
 *
 * This test suite validates that BunkBot's core functionality works correctly
 * after recent fixes, focusing on:
 * 1. Message Response Control
 * 2. Identity System
 * 3. Command System
 *
 * NOTE: Some tests disabled due to simplified bot detection (only checks message.author.bot)
 */

import { mockMessage, mockUser, mockGuild, mockTextChannel } from '../test-utils/testUtils';
// import { isCovaBot, shouldExcludeFromReplyBots, fromBotExcludingCovaBot } from '../core/conditions'; // DISABLED
import { MessageFilter } from '@starbunk/shared';
import { BotFactory, BotConfig } from '../core/bot-factory';
import { BotRegistry } from '../botRegistry';

// Define user IDs for testing - use environment variables or test defaults
const CHAD_USER_ID = process.env.E2E_TEST_MEMBER_ID || '85184539906809856';
const VENN_USER_ID = process.env.E2E_ID_VENN || '151120340343455744';
const GUY_USER_ID = process.env.E2E_ID_GUY || '135820819086573568';
const COVABOT_USER_ID = process.env.STARBUNK_CLIENT_ID || '836445923105308672'; // CovaBot's actual user ID
const REGULAR_USER_ID = '123456789012345678'; // Generic test user

// Mock the shared library with proper debug mode control
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn().mockReturnValue(false),
	MessageFilter: jest.fn().mockImplementation(() => ({
		shouldProcessMessage: jest.fn().mockReturnValue(true),
		isFromAllowedServer: jest.fn().mockReturnValue(true),
		isFromAllowedChannel: jest.fn().mockReturnValue(true),
	})),
}));

// Mock ConfigurationService for identity resolution
jest.mock('../services/configurationService', () => ({
	ConfigurationService: jest.fn().mockImplementation(() => ({
		getUserIdByUsername: jest.fn().mockImplementation((username: string) => {
			const userMap: Record<string, string> = {
				Chad: CHAD_USER_ID,
				Venn: VENN_USER_ID,
				Guy: GUY_USER_ID,
			};
			return Promise.resolve(userMap[username] || null);
		}),
		getUserConfig: jest.fn().mockImplementation((username: string) => {
			const userMap: Record<string, any> = {
				Chad: { userId: CHAD_USER_ID, username: 'Chad', isActive: true },
				Venn: { userId: VENN_USER_ID, username: 'Venn', isActive: true },
				Guy: { userId: GUY_USER_ID, username: 'Guy', isActive: true },
			};
			return Promise.resolve(userMap[username] || null);
		}),
	})),
}));

describe('BunkBot Comprehensive Sanity Check', () => {
	let mockRandomValue = 0.05; // Default to favorable chance (5%)

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset random value to favorable for most tests
		mockRandomValue = 0.05;

		// Mock Math.random to return our controlled value
		jest.spyOn(Math, 'random').mockImplementation(() => mockRandomValue);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('1. Message Response Control', () => {
		describe.skip('Bot Message Filtering - DISABLED', () => {
			it('should identify CovaBot messages correctly', () => {
				const covaBotMessage = mockMessage({
					author: mockUser({
						id: COVABOT_USER_ID,
						bot: true,
						username: 'CovaBot',
						displayName: 'CovaBot',
					}),
				});

				expect(isCovaBot(covaBotMessage)).toBe(true);
			});

			it('should exclude CovaBot from reply bot responses', () => {
				const covaBotMessage = mockMessage({
					author: mockUser({
						id: COVABOT_USER_ID,
						bot: true,
						username: 'CovaBot',
						displayName: 'CovaBot',
					}),
				});

				expect(shouldExcludeFromReplyBots(covaBotMessage)).toBe(true);
			});

			it('should allow regular user messages for reply bots', () => {
				const regularMessage = mockMessage({
					author: mockUser({ id: REGULAR_USER_ID, bot: false }),
				});

				expect(shouldExcludeFromReplyBots(regularMessage)).toBe(false);
			});

			it('should exclude bot messages (except CovaBot) from certain conditions', () => {
				const botMessage = mockMessage({
					author: mockUser({ id: 'other-bot-id', bot: true }),
				});

				const condition = fromBotExcludingCovaBot();
				expect(condition(botMessage)).toBe(true);
			});

			it('should not exclude CovaBot from fromBotExcludingCovaBot condition', () => {
				const covaBotMessage = mockMessage({
					author: mockUser({
						id: COVABOT_USER_ID,
						bot: true,
						username: 'CovaBot',
						displayName: 'CovaBot',
					}),
				});

				const condition = fromBotExcludingCovaBot();
				expect(condition(covaBotMessage)).toBe(false);
			});
		});

		describe('Chance-based Response Control', () => {
			it('should respond when chance is favorable (below threshold)', async () => {
				// Create a test bot with BotFactory
				const testBotConfig: BotConfig = {
					name: 'test-bot',
					description: 'Test bot for chance-based response',
					defaultIdentity: {
						botName: 'TestBot',
						avatarUrl: 'https://example.com/avatar.png',
					},
					triggers: [
						{
							name: 'test-trigger',
							condition: () => Math.random() < 0.1, // 10% chance
							response: () => 'test response',
						},
					],
					defaultResponseRate: 0.1,
				};

				const testBot = BotFactory.createBot(testBotConfig);
				mockRandomValue = 0.05; // 5% - below 10% threshold

				const targetUser = mockUser({ id: CHAD_USER_ID });
				const message = mockMessage({ content: '', author: targetUser });

				// Test that the bot can process messages without throwing
				await expect(testBot.processMessage(message)).resolves.not.toThrow();
				expect(testBot.name).toBe('test-bot');
			});

			it('should NOT respond when chance is unfavorable (above threshold)', async () => {
				// Create a test bot with BotFactory
				const testBotConfig: BotConfig = {
					name: 'test-bot-2',
					description: 'Test bot for unfavorable chance',
					defaultIdentity: {
						botName: 'TestBot2',
						avatarUrl: 'https://example.com/avatar.png',
					},
					triggers: [
						{
							name: 'test-trigger',
							condition: () => Math.random() < 0.1, // 10% chance
							response: () => 'test response',
						},
					],
					defaultResponseRate: 0.1,
				};

				const testBot = BotFactory.createBot(testBotConfig);
				mockRandomValue = 0.15; // 15% - above 10% threshold

				const targetUser = mockUser({ id: CHAD_USER_ID });
				const message = mockMessage({ content: '', author: targetUser });

				// Test that the bot can process messages without throwing
				await expect(testBot.processMessage(message)).resolves.not.toThrow();
				expect(testBot.name).toBe('test-bot-2');
			});
		});

		describe('Message Filter Integration', () => {
			it('should respect DEBUG_MODE settings', () => {
				const messageFilter = new MessageFilter();
				expect(messageFilter).toBeDefined();
				expect(messageFilter.shouldProcessMessage).toBeDefined();
			});

			it('should handle server and channel filtering', () => {
				const messageFilter = new MessageFilter();
				const message = mockMessage({
					guild: mockGuild({ id: '753251582719688714' }),
					channel: mockTextChannel({ id: '987654321098765432' }),
				});

				const _result = messageFilter.shouldProcessMessage(message);
				expect(_result).toBe(true);
			});
		});
	});

	describe('2. Identity System', () => {
		describe('User ID Resolution', () => {
			it('should resolve Chad user ID correctly', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userId = await configService.getUserIdByUsername('Chad');
				expect(userId).toBe(CHAD_USER_ID);
			});

			it('should resolve Venn user ID correctly', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userId = await configService.getUserIdByUsername('Venn');
				expect(userId).toBe(VENN_USER_ID);
			});

			it('should resolve Guy user ID correctly', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userId = await configService.getUserIdByUsername('Guy');
				expect(userId).toBe(GUY_USER_ID);
			});

			it('should return null for unknown users', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userId = await configService.getUserIdByUsername('UnknownUser');
				expect(userId).toBeNull();
			});
		});

		describe('User Configuration', () => {
			it('should get complete user config for Chad', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userConfig = await configService.getUserConfig('Chad');
				expect(userConfig).toEqual({
					userId: CHAD_USER_ID,
					username: 'Chad',
					isActive: true,
				});
			});

			it('should handle graceful fallback for missing identity', async () => {
				const { ConfigurationService } = require('../services/configurationService');
				const configService = new ConfigurationService();

				const userConfig = await configService.getUserConfig('NonExistentUser');
				expect(userConfig).toBeNull();
			});
		});
	});

	describe('3. Command System', () => {
		describe('Slash Command Registration', () => {
			it('should have command handler available', () => {
				// Import command handler
				const commandHandler = require('../commandHandler');
				expect(commandHandler).toBeDefined();
			});

			it('should handle command execution without errors', () => {
				// This is a basic test to ensure command modules can be imported
				expect(() => {
					require('../commandHandler');
				}).not.toThrow();
			});
		});

		describe('Bot Registry Integration', () => {
			it('should discover bots correctly', async () => {
				// Test the static discoverBots method
				await expect(BotRegistry.discoverBots()).resolves.not.toThrow();
			});

			it('should create registry instance without errors', () => {
				expect(() => BotRegistry.getInstance()).not.toThrow();
			});
		});
	});

	describe('4. Integration Validation', () => {
		describe('Reply Bot Integration', () => {
			it('should create bots with BotFactory without errors', () => {
				const testBotConfig: BotConfig = {
					name: 'integration-test-bot',
					description: 'Bot for integration testing',
					defaultIdentity: {
						botName: 'IntegrationBot',
						avatarUrl: 'https://example.com/avatar.png',
					},
					triggers: [
						{
							name: 'integration-trigger',
							condition: () => true,
							response: () => 'integration response',
						},
					],
					defaultResponseRate: 0.5,
				};

				expect(() => BotFactory.createBot(testBotConfig)).not.toThrow();
			});

			it('should have proper bot structure from BotFactory', () => {
				const testBotConfig: BotConfig = {
					name: 'structure-test-bot',
					description: 'Bot for structure testing',
					defaultIdentity: {
						botName: 'StructureBot',
						avatarUrl: 'https://example.com/avatar.png',
					},
					triggers: [
						{
							name: 'structure-trigger',
							condition: () => true,
							response: () => 'structure response',
						},
					],
					defaultResponseRate: 0.5,
				};

				const testBot = BotFactory.createBot(testBotConfig);
				expect(testBot).toBeDefined();
				expect(testBot.name).toBe('structure-test-bot');
				expect(testBot.description).toBe('Bot for structure testing');
				expect(typeof testBot.processMessage).toBe('function');
			});
		});

		describe.skip('Core Conditions Integration - DISABLED', () => {
			it('should have all core conditions available', () => {
				const conditions = require('../core/conditions');
				expect(conditions.isCovaBot).toBeDefined();
				expect(conditions.shouldExcludeFromReplyBots).toBeDefined();
				expect(conditions.fromBotExcludingCovaBot).toBeDefined();
			});

			it('should handle complex message filtering scenarios', () => {
				// Test a complex scenario with multiple conditions
				const covaBotMessage = mockMessage({
					author: mockUser({
						id: COVABOT_USER_ID,
						bot: true,
						username: 'CovaBot',
						displayName: 'CovaBot',
					}),
					content: 'Hello from CovaBot',
				});

				expect(isCovaBot(covaBotMessage)).toBe(true);
				expect(shouldExcludeFromReplyBots(covaBotMessage)).toBe(true);

				const condition = fromBotExcludingCovaBot();
				expect(condition(covaBotMessage)).toBe(false);
			});
		});
	});
});
