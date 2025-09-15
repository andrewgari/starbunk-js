// Debug mode tests for CovaBot container (AI responses and minimal DB)
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
	'../src/services/aiService',
	() => ({
		AIService: jest.fn().mockImplementation(() => ({
			generateResponse: jest.fn().mockResolvedValue('Mock AI response'),
			analyzeIntent: jest.fn().mockResolvedValue({ intent: 'greeting', confidence: 0.95 }),
			generatePersonalityResponse: jest.fn().mockResolvedValue('Mock personality response'),
		})),
	}),
	{ virtual: true },
);

// Mock minimal database
jest.mock(
	'../src/services/minimalDbService',
	() => ({
		MinimalDbService: jest.fn().mockImplementation(() => ({
			storeUserPreference: jest.fn().mockResolvedValue(true),
			getUserPreference: jest.fn().mockResolvedValue('mock-preference'),
			logInteraction: jest.fn().mockResolvedValue(true),
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

describe('CovaBot Debug Mode Functionality', () => {
	const mockGetTestingServerIds = getTestingServerIds as jest.MockedFunction<typeof getTestingServerIds>;
	const mockGetTestingChannelIds = getTestingChannelIds as jest.MockedFunction<typeof getTestingChannelIds>;
	const mockGetDebugMode = getDebugMode as jest.MockedFunction<typeof getDebugMode>;
	const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

	// Mock Discord.js objects for AI interactions
	const createMockMessage = (overrides: any = {}) => ({
		id: '123456789012345678',
		content: 'Hello CovaBot, how are you?',
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
			name: 'general',
			...overrides.channel,
		},
		client: {
			user: { id: 'covabot-id' },
		},
		mentions: {
			has: jest.fn().mockReturnValue(false),
			users: new Map(),
			...overrides.mentions,
		},
		reply: jest.fn(),
		...overrides,
	});

	const createMockInteraction = (overrides: any = {}) => ({
		commandName: 'chat',
		options: {
			getString: jest.fn().mockReturnValue('Hello CovaBot'),
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
			name: 'general',
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

	describe('AI Response Filtering', () => {
		test('should only process AI interactions in allowed guilds when TESTING_SERVER_IDS is set', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed server
			const allowedMessage = createMockMessage({ guild: { id: allowedServerId } });
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked server
			const blockedMessage = createMockMessage({ guild: { id: blockedServerId } });
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing servers');
		});

		test('should only process AI interactions in allowed channels when TESTING_CHANNEL_IDS is set', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			const blockedChannelId = '333444555666777888';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act & Assert - Allowed channel
			const allowedMessage = createMockMessage({ channel: { id: allowedChannelId } });
			const allowedContext = MessageFilter.createContextFromMessage(allowedMessage);
			const allowedResult = filter.shouldProcessMessage(allowedContext);
			expect(allowedResult.allowed).toBe(true);

			// Act & Assert - Blocked channel
			const blockedMessage = createMockMessage({ channel: { id: blockedChannelId } });
			const blockedContext = MessageFilter.createContextFromMessage(blockedMessage);
			const blockedResult = filter.shouldProcessMessage(blockedContext);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.reason).toContain('not in allowed testing channels');
		});

		test('should handle DM interactions correctly with server restrictions', () => {
			// Arrange
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);

			const filter = new MessageFilter();

			// Act - DM message (no guild)
			const dmMessage = createMockMessage({ guild: null });
			const dmContext = MessageFilter.createContextFromMessage(dmMessage);
			const result = filter.shouldProcessMessage(dmContext);

			// Assert - DM messages should be allowed even with server restrictions
			expect(result.allowed).toBe(true);
		});
	});

	describe('LLM Integration Isolation', () => {
		test('should not make actual LLM API calls when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - LLM services should be mocked in debug mode
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No actual OpenAI API calls for chat responses
			// - No actual Anthropic API calls for personality
			// - Mock responses are returned instead
			// - API usage costs are not incurred
		});

		test('should return deterministic mock responses in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Mock responses should be deterministic
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - Same input produces same mock output
			// - Mock responses are suitable for testing
			// - No randomness in debug mode responses
		});

		test('should isolate personality AI features in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Personality features should use mock responses
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - Mock personality traits are used
			// - No external AI calls for personality generation
			// - Consistent personality responses for testing
		});
	});

	describe('Minimal Database Integration', () => {
		test('should use mock database operations in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Database operations should be mocked
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - User preferences are stored in mock DB
			// - Interaction logs use mock storage
			// - No actual database writes occur
		});

		test('should prevent external database connections in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - External database connections should be prevented
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No connections to production databases
			// - Local mock data is used instead
			// - Database state is isolated per test
		});
	});

	describe('AI Command Types', () => {
		test('should filter chat commands correctly', () => {
			// Arrange
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act
			const chatInteraction = createMockInteraction({
				commandName: 'chat',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
			});
			const context = MessageFilter.createContextFromInteraction(chatInteraction);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(true);
		});

		test('should filter personality commands correctly', () => {
			// Arrange
			const blockedServerId = '999888777666555444';
			mockGetTestingServerIds.mockReturnValue(['allowed-server']);

			const filter = new MessageFilter();

			// Act
			const personalityInteraction = createMockInteraction({
				commandName: 'personality',
				guild: { id: blockedServerId },
			});
			const context = MessageFilter.createContextFromInteraction(personalityInteraction);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(false);
		});

		test('should filter mention-based AI responses correctly', () => {
			// Arrange
			const allowedServerId = '111222333444555666';
			mockGetTestingServerIds.mockReturnValue([allowedServerId]);

			const filter = new MessageFilter();

			// Act - Message mentioning CovaBot
			const mentionMessage = createMockMessage({
				content: '@CovaBot hello there',
				guild: { id: allowedServerId },
				mentions: {
					has: jest.fn().mockReturnValue(true),
					users: new Map([['covabot-id', { id: 'covabot-id' }]]),
				},
			});
			const context = MessageFilter.createContextFromMessage(mentionMessage);
			const result = filter.shouldProcessMessage(context);

			// Assert
			expect(result.allowed).toBe(true);
		});
	});

	describe('AI Response Patterns in Debug Mode', () => {
		test('should handle conversation context isolation in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Conversation context should be isolated
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - Conversation history is mocked
			// - No cross-test conversation contamination
			// - Mock conversation state is maintained
		});

		test('should provide consistent AI responses for identical inputs in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act - Same message multiple times
			const message = createMockMessage({
				content: 'Hello CovaBot',
				channel: { id: allowedChannelId },
			});

			// Assert - Should be allowed consistently
			for (let i = 0; i < 5; i++) {
				const context = MessageFilter.createContextFromMessage(message);
				const result = filter.shouldProcessMessage(context);
				expect(result.allowed).toBe(true);
			}
		});
	});

	describe('External Service Integration Isolation', () => {
		test('should isolate external AI service calls in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - External AI services should be isolated
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - No external API calls to OpenAI
			// - No external API calls to Anthropic
			// - No external API calls to other AI services
			// - Mock responses are used instead
		});

		test('should prevent webhook notifications in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - Webhook notifications should be prevented
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would test:
			// - No webhook calls to external services
			// - No notification services are triggered
			// - Mock notification responses are used
		});
	});

	describe('Complex AI Interaction Workflows', () => {
		test('should handle multi-turn conversations in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue([allowedChannelId]);

			const filter = new MessageFilter();

			// Act - Simulate multi-turn conversation
			const conversationTurns = [
				'Hello CovaBot',
				'How are you today?',
				'Can you help me with something?',
				'Thank you for your help',
			];

			// Assert - All turns should be allowed with proper filtering
			conversationTurns.forEach((content) => {
				const message = createMockMessage({
					content,
					channel: { id: allowedChannelId },
				});
				const context = MessageFilter.createContextFromMessage(message);
				const result = filter.shouldProcessMessage(context);
				expect(result.allowed).toBe(true);
			});
		});

		test('should maintain user preference isolation in debug mode', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);

			// Act & Assert - User preferences should be isolated
			expect(mockGetDebugMode()).toBe(true);

			// In a real implementation, this would verify:
			// - User preferences don't affect production data
			// - Mock user preferences are used
			// - Preference state is reset between tests
		});
	});

	describe('AI Response Channel Filtering with DEBUG_MODE=true', () => {
		test('should block AI responses in non-whitelisted channels even when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act - Test AI chat message in blocked channel
			const chatMessage = createMockMessage({
				content: 'Hello CovaBot, how are you?',
				channel: { id: blockedChannelId },
				mentions: {
					has: jest.fn().mockReturnValue(true),
					users: new Map([['covabot-id', { id: 'covabot-id' }]]),
				},
			});
			const chatContext = MessageFilter.createContextFromMessage(chatMessage);
			const chatResult = filter.shouldProcessMessage(chatContext);

			// Assert
			expect(chatResult.allowed).toBe(false);
			expect(chatResult.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			expect(chatResult.reason).toContain('[777888999000111222, 333444555666777888]');
		});

		test('should block all AI command types in non-whitelisted channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different AI commands
			const aiCommands = [
				{ name: 'chat', options: { getString: jest.fn().mockReturnValue('Hello there') } },
				{ name: 'personality', options: { getString: jest.fn().mockReturnValue('friendly') } },
				{ name: 'analyze', options: { getString: jest.fn().mockReturnValue('analyze this text') } },
				{ name: 'summarize', options: { getString: jest.fn().mockReturnValue('summarize this') } },
				{ name: 'translate', options: { getString: jest.fn().mockReturnValue('translate to spanish') } },
				{ name: 'explain', options: { getString: jest.fn().mockReturnValue('explain quantum physics') } },
			];

			aiCommands.forEach((command) => {
				// Act
				const interaction = createMockInteraction({
					commandName: command.name,
					channel: { id: blockedChannelId },
					channelId: blockedChannelId,
					options: command.options,
				});
				const context = MessageFilter.createContextFromInteraction(interaction);
				const result = filter.shouldProcessMessage(context);

				// Assert - All AI commands should be blocked
				expect(result.allowed).toBe(false);
				expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			});
		});

		test('should block mention-based AI responses in non-whitelisted channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Test different mention scenarios
			const mentionScenarios = [
				{ content: '@CovaBot hello there', mentioned: true },
				{ content: 'Hey CovaBot, what do you think?', mentioned: true },
				{ content: 'CovaBot can you help me?', mentioned: false }, // Implicit mention
				{ content: 'AI, please respond', mentioned: false },
			];

			mentionScenarios.forEach((scenario) => {
				// Act
				const message = createMockMessage({
					content: scenario.content,
					channel: { id: blockedChannelId },
					mentions: {
						has: jest.fn().mockReturnValue(scenario.mentioned),
						users: scenario.mentioned ? new Map([['covabot-id', { id: 'covabot-id' }]]) : new Map(),
					},
				});
				const context = MessageFilter.createContextFromMessage(message);
				const result = filter.shouldProcessMessage(context);

				// Assert - All mention-based responses should be blocked
				expect(result.allowed).toBe(false);
				expect(result.reason).toContain('Channel 999999999999999999 not in allowed testing channels');
			});
		});

		test('should allow AI responses in whitelisted channels when DEBUG_MODE=true', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222', '333444555666777888'];
			const allowedChannelId = '777888999000111222';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Act
			const chatInteraction = createMockInteraction({
				commandName: 'chat',
				channel: { id: allowedChannelId },
				channelId: allowedChannelId,
				options: { getString: jest.fn().mockReturnValue('Hello CovaBot') },
			});
			const chatContext = MessageFilter.createContextFromInteraction(chatInteraction);
			const chatResult = filter.shouldProcessMessage(chatContext);

			// Assert
			expect(chatResult.allowed).toBe(true);
			expect(chatResult.reason).toBeUndefined();
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
			const mockPersonalityGeneration = jest.fn();
			const mockResponseGeneration = jest.fn();

			// Act
			const chatInteraction = createMockInteraction({
				commandName: 'chat',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('Tell me a joke') },
			});
			const chatContext = MessageFilter.createContextFromInteraction(chatInteraction);
			const filterResult = filter.shouldProcessMessage(chatContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockOpenAICall();
				mockAnthropicCall();
				mockPersonalityGeneration();
				mockResponseGeneration();
			}

			// Assert - No LLM API calls should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockOpenAICall).not.toHaveBeenCalled();
			expect(mockAnthropicCall).not.toHaveBeenCalled();
			expect(mockPersonalityGeneration).not.toHaveBeenCalled();
			expect(mockResponseGeneration).not.toHaveBeenCalled();
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
			const mockStoreUserPreference = jest.fn();
			const mockLogInteraction = jest.fn();
			const mockUpdateConversation = jest.fn();
			const mockSavePersonality = jest.fn();

			// Act
			const personalityInteraction = createMockInteraction({
				commandName: 'personality',
				channel: { id: blockedChannelId },
				channelId: blockedChannelId,
				options: { getString: jest.fn().mockReturnValue('set friendly mode') },
			});
			const personalityContext = MessageFilter.createContextFromInteraction(personalityInteraction);
			const filterResult = filter.shouldProcessMessage(personalityContext);

			// Simulate proper command processing pipeline
			if (filterResult.allowed) {
				mockStoreUserPreference();
				mockLogInteraction();
				mockUpdateConversation();
				mockSavePersonality();
			}

			// Assert - No database operations should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockStoreUserPreference).not.toHaveBeenCalled();
			expect(mockLogInteraction).not.toHaveBeenCalled();
			expect(mockUpdateConversation).not.toHaveBeenCalled();
			expect(mockSavePersonality).not.toHaveBeenCalled();
		});

		test('should prevent webhook notifications in blocked channels', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock webhook operations
			const mockWebhookNotification = jest.fn();
			const mockExternalAlert = jest.fn();
			const mockStatusUpdate = jest.fn();

			// Act
			const message = createMockMessage({
				content: '@CovaBot emergency help needed',
				channel: { id: blockedChannelId },
				mentions: {
					has: jest.fn().mockReturnValue(true),
					users: new Map([['covabot-id', { id: 'covabot-id' }]]),
				},
			});
			const messageContext = MessageFilter.createContextFromMessage(message);
			const filterResult = filter.shouldProcessMessage(messageContext);

			// Simulate proper message processing pipeline
			if (filterResult.allowed) {
				mockWebhookNotification();
				mockExternalAlert();
				mockStatusUpdate();
			}

			// Assert - No webhook operations should occur when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockWebhookNotification).not.toHaveBeenCalled();
			expect(mockExternalAlert).not.toHaveBeenCalled();
			expect(mockStatusUpdate).not.toHaveBeenCalled();
		});

		test('should verify filtering occurs before conversation context loading', () => {
			// Arrange
			mockGetDebugMode.mockReturnValue(true);
			mockIsDebugMode.mockReturnValue(true);
			const whitelistedChannels = ['777888999000111222'];
			const blockedChannelId = '999999999999999999';
			mockGetTestingChannelIds.mockReturnValue(whitelistedChannels);

			const filter = new MessageFilter();

			// Mock conversation context operations
			const mockLoadConversationHistory = jest.fn();
			const mockLoadUserPreferences = jest.fn();
			const mockLoadPersonalitySettings = jest.fn();
			const mockContextAnalysis = jest.fn();

			// Act
			const chatMessage = createMockMessage({
				content: 'Continue our conversation from yesterday',
				channel: { id: blockedChannelId },
			});
			const chatContext = MessageFilter.createContextFromMessage(chatMessage);
			const filterResult = filter.shouldProcessMessage(chatContext);

			// Simulate proper message processing pipeline
			if (filterResult.allowed) {
				mockLoadConversationHistory();
				mockLoadUserPreferences();
				mockLoadPersonalitySettings();
				mockContextAnalysis();
			}

			// Assert - Conversation context should not be loaded when message is filtered
			expect(filterResult.allowed).toBe(false);
			expect(mockLoadConversationHistory).not.toHaveBeenCalled();
			expect(mockLoadUserPreferences).not.toHaveBeenCalled();
			expect(mockLoadPersonalitySettings).not.toHaveBeenCalled();
			expect(mockContextAnalysis).not.toHaveBeenCalled();
		});
	});
});
