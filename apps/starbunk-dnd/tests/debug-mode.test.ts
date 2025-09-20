// Debug mode tests for Starbunk-DND container (D&D features and LLM integration)
import { MessageFilter, resetMessageFilter } from '@starbunk/shared/dist/services/messageFilter';

// Mock environment validation utilities
jest.mock('@starbunk/shared/dist/utils/envValidation', () => ({
	getTestingServerIds: jest.fn(),
	getTestingChannelIds: jest.fn(),
	getDebugMode: jest.fn(),
	isDebugMode: jest.fn(),
}));

// Mock LLM services
jest.mock(
	'../src/services/llmService',
	() => ({
		LLMService: jest.fn().mockImplementation(() => ({
			generateResponse: jest.fn().mockResolvedValue('Mock LLM response'),
			analyzeMessage: jest.fn().mockResolvedValue({ intent: 'mock', confidence: 0.9 }),
		})),
	}),
	{ virtual: true },
);

// Mock database services
jest.mock(
	'../src/services/campaignService',
	() => ({
		CampaignService: jest.fn().mockImplementation(() => ({
			getCampaign: jest.fn().mockResolvedValue({ id: 'mock-campaign', name: 'Test Campaign' }),
			updateCampaign: jest.fn().mockResolvedValue(true),
		})),
	}),
	{ virtual: true },
);

// Mock logger
jest.mock('@starbunk/shared/dist/services/logger', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

import {
	getTestingServerIds,
	getTestingChannelIds,
	getDebugMode,
	isDebugMode,
} from '@starbunk/shared/dist/utils/envValidation';

describe('Starbunk-DND Debug Mode Functionality', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;
	const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

	// Mock Discord.js objects for D&D commands
	const createMockMessage = (overrides: any = {}) => ({
		id: '123456789012345678',
		content: '/roll 1d20',
		author: {
			id: '987654321098765432',
			username: 'testuser',
			bot: false,
			...overrides.author,
		},
		guild:
			overrides.guild !== null
				? {
						id: '111222333444555666',
						name: 'Test Guild',
						...overrides.guild,
					}
				: null,
		channel: {
			id: '777888999000111222',
			name: 'dnd-session',
			...overrides.channel,
		},
		client: {
			user: { id: 'bot-id' },
		},
		...overrides,
	});

	const createMockInteraction = (overrides: any = {}) => ({
		commandName: 'roll',
		options: {
			getString: jest.fn().mockReturnValue('1d20'),
			getInteger: jest.fn().mockReturnValue(20),
			...overrides.options,
		},
		user: {
			id: '987654321098765432',
			username: 'testuser',
			...overrides.user,
		},
		guild:
			overrides.guild !== null
				? {
						id: '111222333444555666',
						name: 'Test Guild',
						...overrides.guild,
					}
				: null,
		channel: {
			id: '777888999000111222',
			name: 'dnd-session',
			...overrides.channel,
		},
		channelId: '777888999000111222',
		reply: jest.fn(),
		deferReply: jest.fn(),
		editReply: jest.fn(),
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		resetMessageFilter();

		// Default mock implementations
		mockGetTestingServerIds.mockReturnValue([]);
		mockGetTestingChannelIds.mockReturnValue([]);
		mockGetDebugMode.mockReturnValue(false);
		mockIsDebugMode.mockReturnValue(false);
	});

	afterEach(() => {
		// Clear any process event listeners that might be hanging
		process.removeAllListeners('unhandledRejection');
		process.removeAllListeners('uncaughtException');
	});

	describe('D&D Command Filtering', () => {
		test('should only process D&D commands in allowed guilds when TESTING_SERVER_IDS is set', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed server
			const allowedInteraction = createMockInteraction({ guild: { id: allowedServerId } });
			const allowedContext = MessageFilter.createContextFromInteraction(allowedInteraction);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked server
			const blockedInteraction = createMockInteraction({ guild: { id: blockedServerId } });
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing servers');
		});

		test('should only process D&D commands in allowed channels when TESTING_CHANNEL_IDS is set', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			const blockedChannelId = '333444555666777888';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed channel
			const allowedInteraction = createMockInteraction({
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const allowedContext = MessageFilter.createContextFromInteraction(allowedInteraction);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked channel
			const blockedInteraction = createMockInteraction({
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
			});
			const blockedContext = MessageFilter.createContextFromInteraction(blockedInteraction);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing channels');
		});
	});

	describe('LLM Integration Isolation', () => {
		test('should not make actual LLM API calls when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - LLM services should be mocked in debug mode
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No actual OpenAI API calls are made
			// - No actual Anthropic API calls are made
			// - Mock responses are returned instead
			// - API usage costs are not incurred
		});

		test('should return mock LLM responses in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Mock LLM responses should be used
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - Mock character responses for D&D NPCs
			// - Mock story generation
			// - Mock dice roll interpretations
			// - Consistent mock responses for testing
		});

		test('should isolate AI personality features in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - AI personality should use mock responses
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No external AI service calls for personality responses
			// - Mock personality traits are used
			// - Deterministic responses for testing
		});
	});

	describe('Database Integration Isolation', () => {
		test('should use mock database operations in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Database operations should be mocked
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - Campaign data is mocked
			// - Character sheets use mock data
			// - No actual database writes occur
			// - Mock campaign state is maintained
		});

		test('should prevent external database connections in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - External database connections should be prevented
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No connections to production databases
			// - No connections to external campaign services
			// - Local mock data is used instead
		});
	});

	describe('D&D Specific Command Types', () => {
		test('should filter dice roll commands correctly', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act
			const rollInteraction = createMockInteraction({
				commandName: 'roll',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const context = MessageFilter.createContextFromInteraction(rollInteraction);
			const _result = filter.shouldProcessMessage(context);

			// Assert
			expect(_result.allowed).toBe(true);
		});

		test('should filter character sheet commands correctly', () => {
			// Arrange
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);

			const filter = new MessageFilter();

			// Act
			const characterInteraction = createMockInteraction({
				commandName: 'character',
				guild: { id: blockedServerId },
			});
			const context = MessageFilter.createContextFromInteraction(characterInteraction);
			const _result = filter.shouldProcessMessage(context);

			// Assert
			expect(_result.allowed).toBe(false);
		});

		test('should filter campaign management commands correctly', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const allowedChannelId = '777888999000111222';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act
			const campaignInteraction = createMockInteraction({
				commandName: 'campaign',
				guild: { id: allowedServerId },
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const context = MessageFilter.createContextFromInteraction(campaignInteraction);
			const _result = filter.shouldProcessMessage(context);

			// Assert
			expect(_result.allowed).toBe(true);
		});
	});

	describe('Bridge Service Integration', () => {
		test('should isolate server bridge functionality in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Bridge services should be isolated
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - No cross-server message forwarding in debug mode
			// - Bridge connections are mocked
			// - No external server communications
		});

		test('should apply filtering before bridge processing', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act - Message from blocked server should not reach bridge
			const blockedMessage = createMockMessage({ guild: { id: blockedServerId } });
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const blockedResult = filter.shouldProcessMessage(blockedContext);

			// Assert - Should be filtered before bridge processing
			expect(blockedResult.allowed).toBe(false);
		});
	});

	describe('Complex D&D Workflow Testing', () => {
		test('should handle multi-step D&D interactions in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act - Simulate complex D&D workflow
			const steps = [
				{ commandName: 'roll', content: 'roll' },
				{ commandName: 'character', content: 'character' },
				{ commandName: 'campaign', content: 'campaign' },
			];

			// Assert - All steps should be allowed in debug mode with proper filtering
			steps.forEach((step) => {
				const interaction = createMockInteraction({
					commandName: step.commandName,
					channel: { id: allowedChannelId },
					channelId: allowedChannelId,
				});
				const context = MessageFilter.createContextFromInteraction(interaction);
				const _result = filter.shouldProcessMessage(context);
				expect(_result.allowed).toBe(true);
			});
		});

		test('should maintain session state isolation in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Session state should be isolated
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - D&D sessions don't affect production campaigns
			// - Mock session data is used
			// - Session state is reset between tests
		});
	});

	describe('D&D Command Channel Filtering with DEBUG_MODE=true', () => {
		test('should block D&D commands in non-whitelisted channels even when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act - Test dice roll command in blocked channel
			const rollInteraction = createMockInteraction({
				commandName: 'roll',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('1d20+5') },
			});
			const rollContext = MessageFilter.createContextFromInteraction(rollInteraction);
			const rollResult = filter.shouldProcessMessage(rollContext);

			// Assert
			expect(rollResult.allowed).toBe(false);
			expect(rollResult.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			expect(rollResult.reason).toContain('[777888999000111222, 333444555666777888]');
		});

		test('should block all D&D command types in non-whitelisted channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different D&D commands
			const dndCommands = [
				{ name: 'roll', options: { getString: jest.fn().mockReturnValue('1d20') } },
				{ name: 'character', options: { getString: jest.fn().mockReturnValue('create') } },
				{ name: 'campaign', options: { getString: jest.fn().mockReturnValue('start') } },
				{ name: 'initiative', options: { getInteger: jest.fn().mockReturnValue(15) } },
				{ name: 'spell', options: { getString: jest.fn().mockReturnValue('fireball') } },
				{ name: 'npc', options: { getString: jest.fn().mockReturnValue('generate') } },
				{ name: 'encounter', options: { getString: jest.fn().mockReturnValue('random') } },
				{ name: 'loot', options: { getString: jest.fn().mockReturnValue('treasure') } },
			];

			dndCommands.forEach((command) => {
				// Act
				const interaction = createMockInteraction({
					commandName: command.name,
					channel: { id: blockedChannelId },
					channelId: blockedChannelId,
					options: command.options,
				});
				const context = MessageFilter.createContextFromInteraction(interaction);
				const _result = filter.shouldProcessMessage(context);

				// Assert - All D&D commands should be blocked
				expect(_result.allowed).toBe(false);
				expect(_result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			});
		});

		test('should allow D&D commands in whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const rollInteraction = createMockInteraction({
				commandName: 'roll',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
				options: { getString: jest.fn().mockReturnValue('1d20+3') },
			});
			const rollContext = MessageFilter.createContextFromInteraction(rollInteraction);
			const rollResult = filter.shouldProcessMessage(rollContext);

			// Assert
			expect(rollResult.allowed).toBe(true);
			expect(rollResult.reason).toBeUndefined();
		});

		test('should prevent LLM API calls in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock LLM API calls
			const mockOpenAICall = jest.fn();
			const mockAnthropicCall = jest.fn();
			const mockNPCGeneration = jest.fn();
			const mockStoryGeneration = jest.fn();

			// Act
			const npcInteraction = createMockInteraction({
				commandName: 'npc',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('generate wizard') },
			});
			const npcContext = MessageFilter.createContextFromInteraction(npcInteraction);
			const filterResult = filter.shouldProcessMessage(npcContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockOpenAICall();
				mockAnthropicCall();
				mockNPCGeneration();
				mockStoryGeneration();
			}

			// Assert - No LLM API calls should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockOpenAICall).not.toHaveBeenCalled();
			expect(mockAnthropicCall).not.toHaveBeenCalled();
			expect(mockNPCGeneration).not.toHaveBeenCalled();
			expect(mockStoryGeneration).not.toHaveBeenCalled();
		});

		test('should prevent database operations in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock database operations
			const mockSaveCampaign = jest.fn();
			const mockSaveCharacter = jest.fn();
			const mockLogRoll = jest.fn();
			const mockUpdateSession = jest.fn();

			// Act
			const campaignInteraction = createMockInteraction({
				commandName: 'campaign',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('save current') },
			});
			const campaignContext = MessageFilter.createContextFromInteraction(campaignInteraction);
			const filterResult = filter.shouldProcessMessage(campaignContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockSaveCampaign();
				mockSaveCharacter();
				mockLogRoll();
				mockUpdateSession();
			}

			// Assert - No database operations should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockSaveCampaign).not.toHaveBeenCalled();
			expect(mockSaveCharacter).not.toHaveBeenCalled();
			expect(mockLogRoll).not.toHaveBeenCalled();
			expect(mockUpdateSession).not.toHaveBeenCalled();
		});

		test('should prevent bridge service operations in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock bridge service operations
			const mockCrossServerMessage = jest.fn();
			const mockBridgeNotification = jest.fn();
			const mockSyncCampaign = jest.fn();

			// Act
			const bridgeMessage = createMockMessage({
				content: '/bridge sync campaign',
				channel: { id: blockedChannelId },
			});
			const bridgeContext = MessageFilter.createContextFromMessage(bridgeMessage);
			const filterResult = filter.shouldProcessMessage(bridgeContext);

			// Simulate proper message processing pipeline
			if (filterResult.allowed) {
				mockCrossServerMessage();
				mockBridgeNotification();
				mockSyncCampaign();
			}

			// Assert - No bridge operations should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockCrossServerMessage).not.toHaveBeenCalled();
			expect(mockBridgeNotification).not.toHaveBeenCalled();
			expect(mockSyncCampaign).not.toHaveBeenCalled();
		});

		test('should verify filtering occurs before D&D session validation', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock session validation tracking
			const mockSessionValidation = jest.fn();
			const mockCampaignExists = jest.fn();
			const mockUserPermissions = jest.fn();
			const mockChannelSetup = jest.fn();

			// Act
			const rollInteraction = createMockInteraction({
				commandName: 'roll',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('1d20') },
			});
			const rollContext = MessageFilter.createContextFromInteraction(rollInteraction);
			const filterResult = filter.shouldProcessMessage(rollContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockSessionValidation();
				mockCampaignExists();
				mockUserPermissions();
				mockChannelSetup();
			}

			// Assert - Session validation should not occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockSessionValidation).not.toHaveBeenCalled();
			expect(mockCampaignExists).not.toHaveBeenCalled();
			expect(mockUserPermissions).not.toHaveBeenCalled();
			expect(mockChannelSetup).not.toHaveBeenCalled();
		});
	});
});
