import { logger, getDiscordService, DiscordService, container, ServiceId } from '@starbunk/shared';
import { mockBotIdentity, mockDiscordService, mockMessage } from '../../test-utils/testUtils';
import { createPriority, createTriggerName, createTriggerResponse, TriggerResponseClass } from '../trigger-response';

// Mock the logger and Discord service
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	getDiscordService: jest.fn(),
	logger: {
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('Trigger Response', () => {
	let mockDiscordServiceInstance: Partial<DiscordService>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a fresh mock Discord service instance
		mockDiscordServiceInstance = mockDiscordService();
		(getDiscordService as jest.Mock).mockReturnValue(mockDiscordServiceInstance);

		// Register the mock Discord service in the container
		container.register(ServiceId.DiscordService, mockDiscordServiceInstance as DiscordService);
	});

	describe('Type creators', () => {
		describe('createTriggerName', () => {
			it('should create a valid trigger name', () => {
				const name = createTriggerName('test-trigger');
				expect(name).toBe('test-trigger');
			});

			it('should throw an error for empty name', () => {
				expect(() => createTriggerName('')).toThrow('Trigger name cannot be empty');
				expect(() => createTriggerName('  ')).toThrow('Trigger name cannot be empty');
			});
		});

		describe('createPriority', () => {
			it('should create a valid priority', () => {
				const priority = createPriority(10);
				expect(priority).toBe(10);
			});

			it('should throw an error for negative priority', () => {
				expect(() => createPriority(-1)).toThrow('Priority must be a non-negative number');
			});
		});
	});

	describe('createTriggerResponse', () => {
		it('should create a trigger response with the given config', () => {
			const config = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
				identity: mockBotIdentity,
				priority: 10,
			};

			const trigger = createTriggerResponse(config);

			expect(trigger.name).toBe('test-trigger');
			expect(trigger.condition).toBe(config.condition);
			expect(trigger.response).toBe(config.response);
			expect(trigger.identity).toBe(config.identity);
			expect(trigger.priority).toBe(10);
		});

		it('should set default priority to 0', () => {
			const config = {
				name: 'test-trigger',
				condition: jest.fn(),
				response: jest.fn(),
				// No priority specified
			};

			const trigger = createTriggerResponse(config);
			expect(trigger.priority).toBe(0);
		});
	});

	describe('TriggerResponseClass', () => {
		it('should create an instance with the given config', () => {
			const config = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
				identity: mockBotIdentity,
				priority: 10,
				botName: 'test-bot',
			};

			const trigger = new TriggerResponseClass(config);

			expect(trigger.name).toBe('test-trigger');
			const message = mockMessage('Test message');
			trigger.condition(message);
			expect(config.condition).toHaveBeenCalledWith(message);
			trigger.response(message);
			expect(config.response).toHaveBeenCalledWith(message);
			expect(trigger.priority).toBe(10);
		});

		describe('matches', () => {
			it('should return true when condition matches', async () => {
				const condition = jest.fn().mockReturnValue(true);
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: jest.fn(),
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const _result = await trigger.matches(message);

				expect(result).toBe(true);
				expect(condition).toHaveBeenCalledWith(message);
			});

			it('should return false when condition does not match', async () => {
				const condition = jest.fn().mockReturnValue(false);
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: jest.fn(),
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const _result = await trigger.matches(message);

				expect(result).toBe(false);
				expect(condition).toHaveBeenCalledWith(message);
			});

			it('should handle async conditions', async () => {
				const condition = jest.fn().mockResolvedValue(true);
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: jest.fn(),
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const _result = await trigger.matches(message);

				expect(result).toBe(true);
				expect(condition).toHaveBeenCalledWith(message);
			});

			it('should return false and log error if condition throws', async () => {
				const condition = jest.fn().mockImplementation(() => {
					throw new Error('Test error');
				});
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: jest.fn(),
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const _result = await trigger.matches(message);

				expect(result).toBe(false);
				expect(condition).toHaveBeenCalledWith(message);
				expect(logger.error).toHaveBeenCalled();
			});
		});

		describe('getIdentity', () => {
			it('should return the default identity if no identity is specified', async () => {
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn(),
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const _result = await trigger.getIdentity(message, defaultIdentity);

				expect(result).toBe(defaultIdentity);
			});

			it('should return the static identity if provided', async () => {
				const customIdentity = { botName: 'CustomBot', avatarUrl: 'custom.jpg' };
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn(),
					identity: customIdentity,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const _result = await trigger.getIdentity(message, defaultIdentity);

				expect(result).toBe(customIdentity);
			});

			it('should call the identity function if provided', async () => {
				const customIdentity = { botName: 'DynamicBot', avatarUrl: 'dynamic.jpg' };
				const identityFn = jest.fn().mockReturnValue(customIdentity);
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn(),
					identity: identityFn,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const _result = await trigger.getIdentity(message, defaultIdentity);

				expect(result).toBe(customIdentity);
				expect(identityFn).toHaveBeenCalledWith(message);
			});

			it('should handle async identity functions', async () => {
				const customIdentity = { botName: 'AsyncBot', avatarUrl: 'async.jpg' };
				const identityFn = jest.fn().mockResolvedValue(customIdentity);
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn(),
					identity: identityFn,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const _result = await trigger.getIdentity(message, defaultIdentity);

				expect(result).toBe(customIdentity);
				expect(identityFn).toHaveBeenCalledWith(message);
			});

			it('should return null and log error if identity function throws (bot remains silent)', async () => {
				const identityFn = jest.fn().mockImplementation(() => {
					throw new Error('Identity error');
				});
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn(),
					identity: identityFn,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const _result = await trigger.getIdentity(message, defaultIdentity);

				expect(result).toBe(null); // Bot should remain silent when identity resolution fails
				expect(identityFn).toHaveBeenCalledWith(message);
				expect(logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Error getting identity'),
					expect.any(Error),
				);
			});
		});

		describe('process', () => {
			it('should process the message and send a response when condition matches', async () => {
				const condition = jest.fn().mockReturnValue(true);
				const responseGen = jest.fn().mockReturnValue('Test response');
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: responseGen,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const botName = 'TestBot';

				const _result = await trigger.process(message, defaultIdentity, botName);

				expect(result).toBe(true);
				expect(condition).toHaveBeenCalledWith(message);
				expect(responseGen).toHaveBeenCalledWith(message);
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
					message.channel.id,
					defaultIdentity,
					'Test response',
				);
				expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/Trigger "test-trigger" matched/));
			});

			it('should return false when condition does not match', async () => {
				const condition = jest.fn().mockReturnValue(false);
				const responseGen = jest.fn();
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: responseGen,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const botName = 'TestBot';

				const _result = await trigger.process(message, defaultIdentity, botName);

				expect(result).toBe(false);
				expect(condition).toHaveBeenCalledWith(message);
				expect(responseGen).not.toHaveBeenCalled();
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
			});

			it('should use custom identity when provided', async () => {
				const customIdentity = { botName: 'CustomBot', avatarUrl: 'custom.jpg' };
				const condition = jest.fn().mockReturnValue(true);
				const responseGen = jest.fn().mockReturnValue('Custom response');
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: responseGen,
					identity: customIdentity,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const botName = 'TestBot';

				await trigger.process(message, defaultIdentity, botName);

				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
					message.channel.id,
					customIdentity,
					'Custom response',
				);
			});

			it('should handle async response generators', async () => {
				const condition = jest.fn().mockReturnValue(true);
				const responseGen = jest.fn().mockResolvedValue('Async response');
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: responseGen,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const botName = 'TestBot';

				await trigger.process(message, defaultIdentity, botName);

				expect(responseGen).toHaveBeenCalledWith(message);
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
					message.channel.id,
					defaultIdentity,
					'Async response',
				);
			});

			it('should throw and log error if there is a problem during processing', async () => {
				const condition = jest.fn().mockReturnValue(true);
				const responseGen = jest.fn().mockImplementation(() => {
					throw new Error('Response error');
				});
				const trigger = new TriggerResponseClass({
					name: 'test-trigger',
					condition,
					response: responseGen,
					botName: 'test-bot',
				});

				const message = mockMessage('Test message');
				const defaultIdentity = { botName: 'DefaultBot', avatarUrl: 'default.jpg' };
				const botName = 'TestBot';

				await expect(trigger.process(message, defaultIdentity, botName)).rejects.toThrow();

				expect(condition).toHaveBeenCalledWith(message);
				expect(responseGen).toHaveBeenCalledWith(message);
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Error processing'),
					expect.any(Error),
				);
			});
		});
	});
});
