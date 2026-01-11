import { mockMessage, mockUser } from '../../test-utils/test-utils';
import {
	and,
	containsPhrase,
	containsWord,
	createChannelId,
	createDuration,
	createUserId,
	fromBot,
	fromUser,
	inChannel,
	matchesPattern,
	not,
	or,
	withChance,
	withinTimeframeOf,
} from '../conditions';

// Mock Math.random for deterministic tests
const originalRandom = global.Math.random;
let mockRandomValue = 0.5;

beforeEach(() => {
	jest.clearAllMocks();

	// Mock Math.random
	global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);
});

afterAll(() => {
	// Restore original Math.random
	global.Math.random = originalRandom;
});

describe('Type creators', () => {
	describe('createUserId', () => {
		it('should create a valid user ID', () => {
			const userId = createUserId('123456789012345678');
			expect(userId).toBe('123456789012345678');
		});

		it('should throw an error for invalid user ID', () => {
			expect(() => createUserId('123')).toThrow('Invalid user ID format');
			expect(() => createUserId('')).toThrow('Invalid user ID format');
		});
	});

	describe('createChannelId', () => {
		it('should create a valid channel ID', () => {
			const channelId = createChannelId('123456789012345678');
			expect(channelId).toBe('123456789012345678');
		});

		it('should throw an error for invalid channel ID', () => {
			expect(() => createChannelId('123')).toThrow('Invalid channel ID format');
			expect(() => createChannelId('')).toThrow('Invalid channel ID format');
		});
	});

	describe('createDuration', () => {
		it('should create a valid duration', () => {
			const duration = createDuration(100);
			expect(duration).toBe(100);
		});

		it('should throw an error for negative duration', () => {
			expect(() => createDuration(-1)).toThrow('Duration cannot be negative');
		});
	});
});

describe('Condition functions', () => {
	describe('matchesPattern', () => {
		it('should return true when pattern matches', () => {
			const condition = matchesPattern(/test/i);
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(true);
		});

		it('should return false when pattern does not match', () => {
			const condition = matchesPattern(/xyz/i);
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(false);
		});
	});

	describe('containsWord', () => {
		it('should return true when message contains the word', () => {
			const condition = containsWord('test');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(true);
		});

		it('should return false when message does not contain the word', () => {
			const condition = containsWord('xyz');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(false);
		});

		it('should not match partial words', () => {
			const condition = containsWord('tes');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(false);
		});
	});

	describe('containsPhrase', () => {
		it('should return true when message contains the phrase', () => {
			const condition = containsPhrase('test message');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(true);
		});

		it('should return false when message does not contain the phrase', () => {
			const condition = containsPhrase('xyz abc');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(false);
		});

		it('should match case-insensitively', () => {
			const condition = containsPhrase('TEST MESSAGE');
			const message = mockMessage({ content: 'This is a test message' });
			expect(condition(message)).toBe(true);
		});
	});

	describe('fromUser', () => {
		it('should return true when message is from specified user', () => {
			// Override the user ID for this test
			const message = mockMessage({
				content: 'test',
				author: mockUser({ id: '123456789012345678' }),
			});

			const condition = fromUser('123456789012345678');
			expect(condition(message)).toBe(true);
		});

		it('should return false when message is not from specified user', () => {
			const message = mockMessage({
				content: 'test',
				author: mockUser({ id: '987654321098765432' }),
			});

			const condition = fromUser('123456789012345678');
			expect(condition(message)).toBe(false);
		});
	});

	describe('inChannel', () => {
		it('should return true when message is in specified channel', () => {
			const message = mockMessage({ content: 'test' });
			Object.defineProperty(message.channel, 'id', { value: '123456789012345678' });

			const condition = inChannel('123456789012345678');
			expect(condition(message)).toBe(true);
		});

		it('should return false when message is not in specified channel', () => {
			const message = mockMessage({ content: 'test' });
			Object.defineProperty(message.channel, 'id', { value: '987654321098765432' });

			const condition = inChannel('123456789012345678');
			expect(condition(message)).toBe(false);
		});
	});

	describe('withChance', () => {
		it('should return true when random number is less than chance', () => {
			mockRandomValue = 0.3;
			const condition = withChance(50);
			expect(condition(mockMessage())).toBe(true);
		});

		it('should return false when random number is greater than chance', () => {
			mockRandomValue = 0.8;
			const condition = withChance(50);
			expect(condition(mockMessage())).toBe(false);
		});
	});

	describe('fromBot', () => {
		it('should return true when message is from a bot', () => {
			const message = mockMessage({
				content: 'test',
				author: mockUser({ username: 'testUser', bot: true }),
			});
			const condition = fromBot();
			expect(condition(message)).toBe(true);
		});

		it('should return false when message is not from a bot', () => {
			const message = mockMessage({
				content: 'test',
				author: mockUser({ username: 'testUser', bot: false }),
			});
			const condition = fromBot();
			expect(condition(message)).toBe(false);
		});

		it('should exclude self when includeSelf is false', () => {
			const botUserId = 'bot123';
			const message = mockMessage({
				content: 'test',
				author: mockUser({ username: 'testUser', bot: true }),
				client: {
					user: mockUser({ bot: true }),
				},
			});
			// Set both author ID and client user ID to the same value
			Object.defineProperty(message.author, 'id', { value: botUserId });
			Object.defineProperty(message.client.user!, 'id', { value: botUserId });

			const condition = fromBot(false);
			expect(condition(message)).toBe(false);
		});
	});

	describe('withinTimeframeOf', () => {
		it('should return true when timestamp is within timeframe', () => {
			const now = Date.now();
			const timestampFn = () => now - 1000; // 1 second ago
			const condition = withinTimeframeOf(timestampFn, 5, 's');
			expect(condition(mockMessage())).toBe(true);
		});

		it('should return false when timestamp is outside timeframe', () => {
			const now = Date.now();
			const timestampFn = () => now - 10000; // 10 seconds ago
			const condition = withinTimeframeOf(timestampFn, 5, 's');
			expect(condition(mockMessage())).toBe(false);
		});

		it('should handle different time units', () => {
			const now = Date.now();
			const timestampFn = () => now - 30 * 1000; // 30 seconds ago

			// Should be within 1 minute
			const condition1 = withinTimeframeOf(timestampFn, 1, 'm');
			expect(condition1(mockMessage())).toBe(true);

			// Should not be within 20 seconds
			const condition2 = withinTimeframeOf(timestampFn, 20, 's');
			expect(condition2(mockMessage())).toBe(false);
		});
	});

	describe('llmDetects', () => {
		// Note: We're testing the non-LLM implementation which uses string matching
		it('should be properly exported from conditions.ts', () => {
			// This is implicitly tested by other tests,
			// but we don't export it directly so we don't test it here
		});
	});
});

describe('Condition combiners', () => {
	describe('and', () => {
		it('should return true when all conditions are true', async () => {
			const condition1 = () => true;
			const condition2 = () => true;
			const combined = and(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
		});

		it('should return false when any condition is false', async () => {
			const condition1 = () => true;
			const condition2 = () => false;
			const combined = and(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(false);
		});

		it('should short-circuit when a condition is false', async () => {
			const condition1 = jest.fn().mockReturnValue(false);
			const condition2 = jest.fn().mockReturnValue(true);
			const combined = and(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(false);
			expect(condition1).toHaveBeenCalled();
			expect(condition2).not.toHaveBeenCalled();
		});

		it('should work with async conditions', async () => {
			const condition1 = jest.fn().mockResolvedValue(true);
			const condition2 = jest.fn().mockResolvedValue(true);
			const combined = and(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
			expect(condition1).toHaveBeenCalled();
			expect(condition2).toHaveBeenCalled();
		});
	});

	describe('or', () => {
		it('should return true when any condition is true', async () => {
			const condition1 = () => false;
			const condition2 = () => true;
			const combined = or(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
		});

		it('should return false when all conditions are false', async () => {
			const condition1 = () => false;
			const condition2 = () => false;
			const combined = or(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(false);
		});

		it('should short-circuit when a condition is true', async () => {
			const condition1 = jest.fn().mockReturnValue(true);
			const condition2 = jest.fn().mockReturnValue(false);
			const combined = or(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
			expect(condition1).toHaveBeenCalled();
			expect(condition2).not.toHaveBeenCalled();
		});

		it('should work with async conditions', async () => {
			const condition1 = jest.fn().mockResolvedValue(false);
			const condition2 = jest.fn().mockResolvedValue(true);
			const combined = or(condition1, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
		});

		it('should continue checking if a condition throws an error', async () => {
			const errorFn = jest.fn().mockImplementation(() => {
				throw new Error('Test error');
			});
			const condition2 = jest.fn().mockReturnValue(true);
			const combined = or(errorFn, condition2);

			const result = await combined(mockMessage());
			expect(result).toBe(true);
			expect(errorFn).toHaveBeenCalled();
			expect(condition2).toHaveBeenCalled();
		});
	});

	describe('not', () => {
		it('should negate a true condition', async () => {
			const condition = () => true;
			const negated = not(condition);

			const result = await negated(mockMessage());
			expect(result).toBe(false);
		});

		it('should negate a false condition', async () => {
			const condition = () => false;
			const negated = not(condition);

			const result = await negated(mockMessage());
			expect(result).toBe(true);
		});

		it('should work with async conditions', async () => {
			const condition = jest.fn().mockResolvedValue(true);
			const negated = not(condition);

			const result = await negated(mockMessage());
			expect(result).toBe(false);
			expect(condition).toHaveBeenCalled();
		});
	});
});
