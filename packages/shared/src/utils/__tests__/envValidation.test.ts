// Tests for environment validation utilities
import {
	isValidDiscordId,
	parseDiscordIdList,
	getTestingServerIds,
	getTestingChannelIds,
	getDebugMode,
} from '../envValidation';

describe('Environment Validation Utilities', () => {
	// Store original environment variables
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment variables before each test
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		// Restore original environment variables
		process.env = originalEnv;
	});

	describe('isValidDiscordId', () => {
		test('should validate correct Discord snowflake IDs', () => {
			expect(isValidDiscordId('753251582719688714')).toBe(true);
			expect(isValidDiscordId('836445923105308672')).toBe(true);
			expect(isValidDiscordId('12345678901234567')).toBe(true); // 17 digits
			expect(isValidDiscordId('1234567890123456789')).toBe(true); // 19 digits
		});

		test('should reject invalid Discord IDs', () => {
			expect(isValidDiscordId('123')).toBe(false); // Too short
			expect(isValidDiscordId('12345678901234567890')).toBe(false); // Too long
			expect(isValidDiscordId('abc123def456789012')).toBe(false); // Contains letters
			expect(isValidDiscordId('123-456-789-012-345')).toBe(false); // Contains hyphens
			expect(isValidDiscordId('')).toBe(false); // Empty string
			expect(isValidDiscordId('123.456.789.012.345')).toBe(false); // Contains dots
		});
	});

	describe('parseDiscordIdList', () => {
		test('should parse valid comma-separated Discord IDs', () => {
			const _result = parseDiscordIdList('753251582719688714,836445923105308672');
			expect(_result).toEqual(['753251582719688714', '836445923105308672']);
		});

		test('should handle whitespace around IDs', () => {
			const _result = parseDiscordIdList(' 753251582719688714 , 836445923105308672 ');
			expect(_result).toEqual(['753251582719688714', '836445923105308672']);
		});

		test('should filter out invalid IDs', () => {
			const _result = parseDiscordIdList('753251582719688714,invalid,836445923105308672,123');
			expect(_result).toEqual(['753251582719688714', '836445923105308672']);
		});

		test('should handle empty or undefined input', () => {
			expect(parseDiscordIdList('')).toEqual([]);
			expect(parseDiscordIdList('   ')).toEqual([]);
			expect(parseDiscordIdList(undefined)).toEqual([]);
		});

		test('should handle single ID', () => {
			const _result = parseDiscordIdList('753251582719688714');
			expect(_result).toEqual(['753251582719688714']);
		});

		test('should handle trailing commas', () => {
			const _result = parseDiscordIdList('753251582719688714,836445923105308672,');
			expect(_result).toEqual(['753251582719688714', '836445923105308672']);
		});
	});

	describe('getTestingServerIds', () => {
		test('should return parsed server IDs from environment', () => {
			process.env.TESTING_SERVER_IDS = '753251582719688714,836445923105308672';
			const _result = getTestingServerIds();
			expect(_result).toEqual(['753251582719688714', '836445923105308672']);
		});

		test('should return empty array when not set', () => {
			delete process.env.TESTING_SERVER_IDS;
			const _result = getTestingServerIds();
			expect(_result).toEqual([]);
		});
	});

	describe('getTestingChannelIds', () => {
		test('should return parsed channel IDs from environment', () => {
			process.env.TESTING_CHANNEL_IDS = '123456789012345678,987654321098765432';
			const _result = getTestingChannelIds();
			expect(_result).toEqual(['123456789012345678', '987654321098765432']);
		});

		test('should return empty array when not set', () => {
			delete process.env.TESTING_CHANNEL_IDS;
			const _result = getTestingChannelIds();
			expect(_result).toEqual([]);
		});
	});

	describe('getDebugMode', () => {
		test('should return true when DEBUG_MODE is "true"', () => {
			process.env.DEBUG_MODE = 'true';
			expect(getDebugMode()).toBe(true);
		});

		test('should return false when DEBUG_MODE is "false"', () => {
			process.env.DEBUG_MODE = 'false';
			expect(getDebugMode()).toBe(false);
		});

		test('should return false when DEBUG_MODE is not set', () => {
			delete process.env.DEBUG_MODE;
			expect(getDebugMode()).toBe(false);
		});

		test('should return false for invalid values', () => {
			process.env.DEBUG_MODE = 'yes';
			expect(getDebugMode()).toBe(false);

			process.env.DEBUG_MODE = '1';
			expect(getDebugMode()).toBe(true);

			process.env.DEBUG_MODE = '0';
			expect(getDebugMode()).toBe(false);
		});
	});
});
