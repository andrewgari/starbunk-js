import { BotResponseLogger, getBotResponseLogger, type BotResponseLog } from '../bot-response-logger';
import { logger as baseLogger } from '../../logger';

// Mock the logger
jest.mock('../../logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

// Mock getStructuredLogger
jest.mock('../index', () => ({
	getStructuredLogger: jest.fn(() => ({
		logMessageFlow: jest.fn(),
	})),
}));

describe('BotResponseLogger', () => {
	let responseLogger: BotResponseLogger;

	beforeEach(() => {
		jest.clearAllMocks();
		responseLogger = new BotResponseLogger('test-service');
	});

	describe('logBotResponse', () => {
		it('should log a complete bot response with all required fields', () => {
			const logEntry: BotResponseLog = {
				original_message: 'Hello bot!',
				bot_response: 'Hello there!',
				timestamp: new Date().toISOString(),
				bot_name: 'TestBot',
				nickname_used: 'TestNickname',
				avatar_url_used: 'https://cdn.discordapp.com/avatars/123/avatar.png',
				trigger_condition: 'keyword_match',
				trigger_name: 'test-trigger',
				user_id: '123456789',
				channel_id: '987654321',
				guild_id: 'guild-123',
				response_latency_ms: 150,
			};

			responseLogger.logBotResponse(logEntry);

			// Verify logging was called (exact implementation depends on ENABLE_STRUCTURED_LOGGING)
			expect(baseLogger.info).toHaveBeenCalled();
		});

		it('should handle different trigger conditions', () => {
			const triggerConditions: BotResponseLog['trigger_condition'][] = [
				'direct_mention',
				'keyword_match',
				'llm_decision',
				'random_chance',
				'pattern_match',
				'command',
			];

			triggerConditions.forEach((condition) => {
				const logEntry: BotResponseLog = {
					original_message: 'Test message',
					bot_response: 'Test response',
					timestamp: new Date().toISOString(),
					bot_name: 'TestBot',
					nickname_used: 'TestNickname',
					avatar_url_used: 'https://cdn.discordapp.com/avatars/123/avatar.png',
					trigger_condition: condition,
					trigger_name: `test-${condition}`,
					user_id: '123456789',
					channel_id: '987654321',
					guild_id: 'guild-123',
				};

				responseLogger.logBotResponse(logEntry);
			});

			expect(baseLogger.info).toHaveBeenCalledTimes(triggerConditions.length);
		});

		it('should not throw on logging errors', () => {
			// Mock logger to throw an error
			(baseLogger.info as jest.Mock).mockImplementationOnce(() => {
				throw new Error('Logging failed');
			});

			const logEntry: BotResponseLog = {
				original_message: 'Test',
				bot_response: 'Response',
				timestamp: new Date().toISOString(),
				bot_name: 'TestBot',
				nickname_used: 'TestNickname',
				avatar_url_used: 'https://cdn.discordapp.com/avatars/123/avatar.png',
				trigger_condition: 'keyword_match',
				trigger_name: 'test-trigger',
				user_id: '123',
				channel_id: '456',
				guild_id: 'guild',
			};

			// Should not throw
			expect(() => responseLogger.logBotResponse(logEntry)).not.toThrow();
			expect(baseLogger.warn).toHaveBeenCalled();
		});
	});

	describe('logBotResponseError', () => {
		it('should log bot response errors', () => {
			const error = new Error('Test error');
			const context: Partial<BotResponseLog> = {
				original_message: 'Test message',
				user_id: '123',
				channel_id: '456',
				guild_id: 'guild',
			};

			responseLogger.logBotResponseError('TestBot', 'test-trigger', error, context);

			expect(baseLogger.info).toHaveBeenCalled();
		});
	});

	describe('getBotResponseLogger', () => {
		it('should return singleton instance for same service', () => {
			const logger1 = getBotResponseLogger('test-service');
			const logger2 = getBotResponseLogger('test-service');

			expect(logger1).toBe(logger2);
		});

		it('should return different instances for different services', () => {
			const logger1 = getBotResponseLogger('service-1');
			const logger2 = getBotResponseLogger('service-2');

			expect(logger1).not.toBe(logger2);
		});

		it('should use default service name if not provided', () => {
			const logger = getBotResponseLogger();
			expect(logger).toBeDefined();
		});
	});
});
