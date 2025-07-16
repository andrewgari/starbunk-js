import { CovaBot, CovaBotConfig } from '../covaBot';
import { getCovaIdentity } from '../../services/identity';
import { BotIdentity } from '../../types/botIdentity';
import { TriggerResponse } from '../../types/triggerResponse';
import { logger } from '@starbunk/shared';
import {
	MockDiscordMessage,
	createCovaDirectMentionMessage,
	createCovaNameMentionMessage,
	createBotMessage,
	createCovaBotMessage,
} from '../../__tests__/mocks/discord-mocks';

// Mock dependencies
jest.mock('../../services/identity');
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

const mockGetCovaIdentity = getCovaIdentity as jest.MockedFunction<typeof getCovaIdentity>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot - Comprehensive Core Functionality Tests', () => {
	let covaBot: CovaBot;
	let mockIdentity: BotIdentity;
	let mockTrigger: TriggerResponse;

	beforeEach(() => {
		jest.clearAllMocks();

		mockIdentity = {
			botName: 'Cova',
			avatarUrl: 'https://cdn.discordapp.com/avatars/123/cova-avatar.png',
		};

		mockTrigger = {
			name: 'test-trigger',
			priority: 1,
			condition: jest.fn().mockResolvedValue(true),
			response: jest.fn().mockResolvedValue('Test response'),
		};

		const config: CovaBotConfig = {
			name: 'CovaBot',
			description: 'Test CovaBot',
			defaultIdentity: mockIdentity,
			triggers: [mockTrigger],
			defaultResponseRate: 100,
			skipBotMessages: true,
			disabled: false,
		};

		covaBot = new CovaBot(config);
		mockGetCovaIdentity.mockResolvedValue(mockIdentity);
	});

	describe('Basic Configuration and Metadata', () => {
		it('should return correct name and description', () => {
			expect(covaBot.name).toBe('CovaBot');
			expect(covaBot.description).toBe('Test CovaBot');
		});

		it('should return correct metadata', () => {
			const metadata = covaBot.metadata;
			expect(metadata.responseRate).toBe(100);
			expect(metadata.disabled).toBe(false);
		});

		it('should handle default configuration values', () => {
			const minimalConfig: CovaBotConfig = {
				name: 'MinimalBot',
				description: 'Minimal test bot',
				defaultIdentity: mockIdentity,
				triggers: [],
			};

			const minimalBot = new CovaBot(minimalConfig);
			const metadata = minimalBot.metadata;

			expect(metadata.responseRate).toBe(100); // Default value
			expect(metadata.disabled).toBe(false); // Default value
		});
	});

	describe('Web Message Processing (Non-Discord)', () => {
		it('should process web messages without Discord integration', async () => {
			const response = await covaBot.processWebMessage('Hello CovaBot!');

			expect(response).toBe('Test response');
			expect(mockTrigger.condition).toHaveBeenCalled();
			expect(mockTrigger.response).toHaveBeenCalled();
			
			// Should not call Discord identity service for web messages
			expect(mockGetCovaIdentity).not.toHaveBeenCalled();
		});

		it('should return null when no triggers match', async () => {
			(mockTrigger.condition as jest.Mock).mockResolvedValue(false);

			const response = await covaBot.processWebMessage('No match');

			expect(response).toBeNull();
			expect(mockTrigger.condition).toHaveBeenCalled();
			expect(mockTrigger.response).not.toHaveBeenCalled();
		});

		it('should return null when bot is disabled', async () => {
			const disabledConfig: CovaBotConfig = {
				name: 'DisabledBot',
				description: 'Disabled test bot',
				defaultIdentity: mockIdentity,
				triggers: [mockTrigger],
				disabled: true,
			};

			const disabledBot = new CovaBot(disabledConfig);
			const response = await disabledBot.processWebMessage('Hello');

			expect(response).toBeNull();
			expect(mockTrigger.condition).not.toHaveBeenCalled();
		});

		it('should handle empty responses from triggers', async () => {
			(mockTrigger.response as jest.Mock).mockResolvedValue('');

			const response = await covaBot.processWebMessage('Hello');

			expect(response).toBeNull();
			expect(mockTrigger.condition).toHaveBeenCalled();
			expect(mockTrigger.response).toHaveBeenCalled();
		});

		it('should handle null responses from triggers', async () => {
			(mockTrigger.response as jest.Mock).mockResolvedValue(null);

			const response = await covaBot.processWebMessage('Hello');

			expect(response).toBeNull();
		});

		it('should handle trigger errors gracefully', async () => {
			(mockTrigger.condition as jest.Mock).mockRejectedValue(new Error('Trigger error'));

			const response = await covaBot.processWebMessage('Hello');

			expect(response).toBeNull();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in trigger'),
				expect.any(Error)
			);
		});
	});

	describe('Response Rate Limiting', () => {
		it('should respect response rate of 0 (never respond)', async () => {
			const noResponseConfig: CovaBotConfig = {
				name: 'NoResponseBot',
				description: 'Bot that never responds',
				defaultIdentity: mockIdentity,
				triggers: [mockTrigger],
				defaultResponseRate: 0,
			};

			const noResponseBot = new CovaBot(noResponseConfig);
			const response = await noResponseBot.processWebMessage('Hello');

			expect(response).toBeNull();
			expect(mockTrigger.condition).not.toHaveBeenCalled();
		});

		it('should always respond with rate of 100', async () => {
			// Test multiple times to ensure consistency
			for (let i = 0; i < 5; i++) {
				const response = await covaBot.processWebMessage(`Hello ${i}`);
				expect(response).toBe('Test response');
			}
		});

		it('should sometimes skip responses with partial rate', async () => {
			const partialRateConfig: CovaBotConfig = {
				name: 'PartialRateBot',
				description: 'Bot with 50% response rate',
				defaultIdentity: mockIdentity,
				triggers: [mockTrigger],
				defaultResponseRate: 50,
			};

			const partialRateBot = new CovaBot(partialRateConfig);
			
			// Mock Math.random to control randomness
			const originalRandom = Math.random;
			let responses = 0;
			let nullResponses = 0;

			try {
				// Test with deterministic random values
				Math.random = jest.fn()
					.mockReturnValueOnce(0.3) // Should respond (30 < 50)
					.mockReturnValueOnce(0.7) // Should not respond (70 >= 50)
					.mockReturnValueOnce(0.1) // Should respond (10 < 50)
					.mockReturnValueOnce(0.9); // Should not respond (90 >= 50)

				for (let i = 0; i < 4; i++) {
					const response = await partialRateBot.processWebMessage(`Test ${i}`);
					if (response) responses++;
					else nullResponses++;
				}

				expect(responses).toBe(2);
				expect(nullResponses).toBe(2);
			} finally {
				Math.random = originalRandom;
			}
		});
	});

	describe('Trigger Priority Handling', () => {
		it('should process triggers in priority order (highest first)', async () => {
			const lowPriorityTrigger: TriggerResponse = {
				name: 'low-priority',
				priority: 1,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('Low priority response'),
			};

			const highPriorityTrigger: TriggerResponse = {
				name: 'high-priority',
				priority: 10,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('High priority response'),
			};

			const priorityConfig: CovaBotConfig = {
				name: 'PriorityBot',
				description: 'Bot with priority triggers',
				defaultIdentity: mockIdentity,
				triggers: [lowPriorityTrigger, highPriorityTrigger], // Added in reverse order
			};

			const priorityBot = new CovaBot(priorityConfig);
			const response = await priorityBot.processWebMessage('Test');

			expect(response).toBe('High priority response');
			expect(highPriorityTrigger.condition).toHaveBeenCalled();
			expect(highPriorityTrigger.response).toHaveBeenCalled();
			expect(lowPriorityTrigger.condition).not.toHaveBeenCalled();
		});

		it('should fall back to lower priority triggers when higher ones fail', async () => {
			const failingTrigger: TriggerResponse = {
				name: 'failing-trigger',
				priority: 10,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockRejectedValue(new Error('Trigger failed')),
			};

			const workingTrigger: TriggerResponse = {
				name: 'working-trigger',
				priority: 5,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('Working response'),
			};

			const fallbackConfig: CovaBotConfig = {
				name: 'FallbackBot',
				description: 'Bot with fallback triggers',
				defaultIdentity: mockIdentity,
				triggers: [workingTrigger, failingTrigger],
			};

			const fallbackBot = new CovaBot(fallbackConfig);
			const response = await fallbackBot.processWebMessage('Test');

			expect(response).toBe('Working response');
			expect(failingTrigger.condition).toHaveBeenCalled();
			expect(failingTrigger.response).toHaveBeenCalled();
			expect(workingTrigger.condition).toHaveBeenCalled();
			expect(workingTrigger.response).toHaveBeenCalled();
		});
	});

	describe('Error Handling and Resilience', () => {
		it('should handle malformed messages gracefully', async () => {
			const response = await covaBot.processWebMessage('');
			// Should not crash, may return null or handle empty message
			expect(typeof response === 'string' || response === null).toBe(true);
		});

		it('should continue processing after trigger errors', async () => {
			const errorTrigger: TriggerResponse = {
				name: 'error-trigger',
				priority: 10,
				condition: jest.fn().mockRejectedValue(new Error('Condition error')),
				response: jest.fn(),
			};

			const workingTrigger: TriggerResponse = {
				name: 'working-trigger',
				priority: 5,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('Success'),
			};

			const errorConfig: CovaBotConfig = {
				name: 'ErrorBot',
				description: 'Bot with error handling',
				defaultIdentity: mockIdentity,
				triggers: [errorTrigger, workingTrigger],
			};

			const errorBot = new CovaBot(errorConfig);
			const response = await errorBot.processWebMessage('Test');

			expect(response).toBe('Success');
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should handle response generation errors', async () => {
			(mockTrigger.response as jest.Mock).mockRejectedValue(new Error('Response error'));

			const response = await covaBot.processWebMessage('Test');

			expect(response).toBeNull();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Error in trigger'),
				expect.any(Error)
			);
		});
	});
});
