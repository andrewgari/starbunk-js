// Comprehensive tests for debug configuration validation and edge cases
import { 
	getDebugMode, 
	getTestingServerIds, 
	getTestingChannelIds,
	parseDiscordIdList,
	isValidDiscordId
} from '../src/utils/envValidation';

// Mock process.env
const mockEnv = (envVars: Record<string, string | undefined>) => {
	const originalEnv = process.env;
	process.env = { ...originalEnv, ...envVars };
	return () => {
		process.env = originalEnv;
	};
};

describe('Debug Configuration Validation', () => {
	let restoreEnv: () => void;

	afterEach(() => {
		if (restoreEnv) {
			restoreEnv();
		}
	});

	describe('DEBUG_MODE Environment Variable', () => {
		test('should return true for DEBUG_MODE=true', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: 'true' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(true);
		});

		test('should return true for DEBUG_MODE=1', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: '1' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(true);
		});

		test('should return false for DEBUG_MODE=false', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: 'false' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(false);
		});

		test('should return false for DEBUG_MODE=0', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: '0' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(false);
		});

		test('should return false when DEBUG_MODE is not set', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: undefined });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(false);
		});

		test('should handle case-insensitive values', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: 'TRUE' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(true);
		});

		test('should return false for invalid values', () => {
			// Arrange
			restoreEnv = mockEnv({ DEBUG_MODE: 'invalid' });
			
			// Act
			const result = getDebugMode();
			
			// Assert
			expect(result).toBe(false);
		});
	});

	describe('TESTING_SERVER_IDS Environment Variable', () => {
		test('should parse single valid Discord ID', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '123456789012345678' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678']);
		});

		test('should parse multiple valid Discord IDs', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '123456789012345678,987654321098765432' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432']);
		});

		test('should handle whitespace around IDs', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: ' 123456789012345678 , 987654321098765432 ' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432']);
		});

		test('should filter out invalid Discord IDs', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '123456789012345678,invalid-id,987654321098765432' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432']);
		});

		test('should return empty array when not set', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: undefined });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual([]);
		});

		test('should return empty array for empty string', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual([]);
		});

		test('should handle trailing commas', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '123456789012345678,' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678']);
		});
	});

	describe('TESTING_CHANNEL_IDS Environment Variable', () => {
		test('should parse single valid Discord ID', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_CHANNEL_IDS: '777888999000111222' });
			
			// Act
			const result = getTestingChannelIds();
			
			// Assert
			expect(result).toEqual(['777888999000111222']);
		});

		test('should parse multiple valid Discord IDs', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_CHANNEL_IDS: '777888999000111222,333444555666777888' });
			
			// Act
			const result = getTestingChannelIds();
			
			// Assert
			expect(result).toEqual(['777888999000111222', '333444555666777888']);
		});

		test('should filter out invalid Discord IDs', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_CHANNEL_IDS: '777888999000111222,bad-id,333444555666777888' });
			
			// Act
			const result = getTestingChannelIds();
			
			// Assert
			expect(result).toEqual(['777888999000111222', '333444555666777888']);
		});

		test('should return empty array when not set', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_CHANNEL_IDS: undefined });
			
			// Act
			const result = getTestingChannelIds();
			
			// Assert
			expect(result).toEqual([]);
		});
	});

	describe('Discord ID Validation', () => {
		test('should validate correct Discord snowflake IDs', () => {
			// Arrange
			const validIds = [
				'123456789012345678', // 18 digits
				'12345678901234567',  // 17 digits
				'1234567890123456789' // 19 digits
			];
			
			// Act & Assert
			validIds.forEach(id => {
				expect(isValidDiscordId(id)).toBe(true);
			});
		});

		test('should reject invalid Discord IDs', () => {
			// Arrange
			const invalidIds = [
				'12345678901234567890', // 20 digits (too long)
				'1234567890123456',     // 16 digits (too short)
				'invalid-id',           // non-numeric
				'123abc789012345678',   // contains letters
				'',                     // empty string
				'123 456 789 012 345 678' // contains spaces
			];
			
			// Act & Assert
			invalidIds.forEach(id => {
				expect(isValidDiscordId(id)).toBe(false);
			});
		});
	});

	describe('parseDiscordIdList Function', () => {
		test('should parse valid comma-separated list', () => {
			// Arrange
			const input = '123456789012345678,987654321098765432,777888999000111222';
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432', '777888999000111222']);
		});

		test('should handle mixed valid and invalid IDs', () => {
			// Arrange
			const input = '123456789012345678,invalid,987654321098765432,also-invalid,777888999000111222';
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432', '777888999000111222']);
		});

		test('should handle undefined input', () => {
			// Arrange
			const input = undefined;
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual([]);
		});

		test('should handle empty string input', () => {
			// Arrange
			const input = '';
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual([]);
		});

		test('should handle whitespace-only input', () => {
			// Arrange
			const input = '   ';
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual([]);
		});

		test('should handle single ID with whitespace', () => {
			// Arrange
			const input = '  123456789012345678  ';
			
			// Act
			const result = parseDiscordIdList(input);
			
			// Assert
			expect(result).toEqual(['123456789012345678']);
		});
	});

	describe('Environment Variable Precedence', () => {
		test('should prioritize environment variables over defaults', () => {
			// Arrange
			restoreEnv = mockEnv({
				DEBUG_MODE: 'true',
				TESTING_SERVER_IDS: '123456789012345678',
				TESTING_CHANNEL_IDS: '777888999000111222'
			});
			
			// Act
			const debugMode = getDebugMode();
			const serverIds = getTestingServerIds();
			const channelIds = getTestingChannelIds();
			
			// Assert
			expect(debugMode).toBe(true);
			expect(serverIds).toEqual(['123456789012345678']);
			expect(channelIds).toEqual(['777888999000111222']);
		});

		test('should handle partial environment configuration', () => {
			// Arrange
			restoreEnv = mockEnv({
				DEBUG_MODE: 'true',
				TESTING_SERVER_IDS: '123456789012345678'
				// TESTING_CHANNEL_IDS not set
			});
			
			// Act
			const debugMode = getDebugMode();
			const serverIds = getTestingServerIds();
			const channelIds = getTestingChannelIds();
			
			// Assert
			expect(debugMode).toBe(true);
			expect(serverIds).toEqual(['123456789012345678']);
			expect(channelIds).toEqual([]); // Should be empty when not set
		});
	});

	describe('Edge Cases and Error Handling', () => {
		test('should handle extremely long ID lists', () => {
			// Arrange
			const longList = Array.from({ length: 100 }, (_, i) => 
				`12345678901234567${i.toString().padStart(2, '0')}`
			).join(',');
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: longList });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toHaveLength(100);
			expect(result[0]).toBe('123456789012345670');
			expect(result[99]).toBe('123456789012345699');
		});

		test('should handle malformed comma-separated values', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: ',,123456789012345678,,987654321098765432,,' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual(['123456789012345678', '987654321098765432']);
		});

		test('should handle special characters in environment values', () => {
			// Arrange
			restoreEnv = mockEnv({ TESTING_SERVER_IDS: '123456789012345678;987654321098765432' });
			
			// Act
			const result = getTestingServerIds();
			
			// Assert
			expect(result).toEqual([]); // Should be empty as semicolon is not a valid separator
		});
	});
});
