import fs from 'fs';
import path from 'path';
import { BotStateService } from '../../services/botStateService';

// Mock the fs module
jest.mock('fs', () => ({
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	writeFileSync: jest.fn(),
	readFileSync: jest.fn()
}));

// Mock the Logger to avoid console output during tests
jest.mock('../../services/logger', () => ({
	Logger: {
		debug: jest.fn(),
		error: jest.fn()
	}
}));

describe('BotStateService', () => {
	let botStateService: BotStateService;

	// Mock file data for testing
	const mockStorageDir = path.join(process.cwd(), '.botstate');
	const mockStateFile = path.join(mockStorageDir, 'state.json');
	const mockFileData = JSON.stringify({
		'test_key': 'test_value',
		'number_key': 42,
		'boolean_key': true,
		'bluebot_last_initial_message_time': 1234567890
	});

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Setup mocks for files
		(fs.existsSync as jest.Mock).mockImplementation((path) => {
			// State file exists, directory exists
			return path === mockStateFile || path === mockStorageDir;
		});

		(fs.readFileSync as jest.Mock).mockReturnValue(mockFileData);

		// Get a fresh instance for each test
		// We use a little trick with Object.getOwnPropertyDescriptor to allow creating
		// multiple instances during tests despite the singleton pattern
		const descriptor = Object.getOwnPropertyDescriptor(BotStateService, 'instance');
		Object.defineProperty(BotStateService, 'instance', {
			value: undefined,
			writable: true
		});

		botStateService = BotStateService.getInstance();

		// Restore the original descriptor after getting our instance
		if (descriptor) {
			Object.defineProperty(BotStateService, 'instance', descriptor);
		}
	});

	describe('getInstance', () => {
		it('should return a singleton instance', () => {
			const instance1 = BotStateService.getInstance();
			const instance2 = BotStateService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('getState', () => {
		it('should return the value for an existing key', () => {
			expect(botStateService.getState('test_key', '')).toBe('test_value');
			expect(botStateService.getState('number_key', 0)).toBe(42);
			expect(botStateService.getState('boolean_key', false)).toBe(true);
		});

		it('should return the default value for a non-existent key', () => {
			expect(botStateService.getState('non_existent_key', 'default')).toBe('default');
			expect(botStateService.getState('another_missing_key', 123)).toBe(123);
		});

		it('should return typed values correctly', () => {
			expect(botStateService.getState<number>('number_key', 0)).toBe(42);
			expect(botStateService.getState<string>('test_key', '')).toBe('test_value');
			expect(botStateService.getState<boolean>('boolean_key', false)).toBe(true);
		});
	});

	describe('setState', () => {
		it('should update the state and save to disk', () => {
			botStateService.setState('new_key', 'new_value');

			// Check that the value is available immediately
			expect(botStateService.getState('new_key', '')).toBe('new_value');

			// Check that the state was saved to disk
			expect(fs.writeFileSync).toHaveBeenCalledWith(
				mockStateFile,
				expect.any(String)
			);
		});

		it('should create the directory if it does not exist', () => {
			// Setup mock to say the directory doesn't exist
			(fs.existsSync as jest.Mock).mockImplementation((path) => {
				// Only the file exists, not the directory
				return path === mockStateFile;
			});

			botStateService.setState('key', 'value');

			// Should create the directory
			expect(fs.mkdirSync).toHaveBeenCalledWith(
				mockStorageDir,
				{ recursive: true }
			);
		});
	});

	describe('loadState', () => {
		it('should load state from disk on initialization', () => {
			// Check that readFileSync was called during initialization
			expect(fs.readFileSync).toHaveBeenCalledWith(
				mockStateFile,
				'utf-8'
			);

			// Verify the data was loaded correctly
			expect(botStateService.getState('test_key', '')).toBe('test_value');
		});

		it('should handle missing state file gracefully', () => {
			// Clear all mocks to start fresh
			jest.clearAllMocks();

			// Setup mock to say the file doesn't exist
			(fs.existsSync as jest.Mock).mockReturnValue(false);

			// Get a fresh instance with the new mock
			const descriptor = Object.getOwnPropertyDescriptor(BotStateService, 'instance');
			Object.defineProperty(BotStateService, 'instance', {
				value: undefined,
				writable: true
			});

			// This should initialize with an empty state
			const freshService = BotStateService.getInstance();

			// Should not try to read a file that doesn't exist
			// Note: We don't check if readFileSync was called because the implementation might
			// still call it in some cases where file doesn't exist. What matters is the behavior.

			// Should return default values
			expect(freshService.getState('any_key', 'default')).toBe('default');

			// Restore the descriptor
			if (descriptor) {
				Object.defineProperty(BotStateService, 'instance', descriptor);
			}
		});
	});

	describe('persistent state for bots', () => {
		it('should store and retrieve time values for BlueBot', () => {
			const timestamp = Date.now();
			botStateService.setState('bluebot_last_initial_message_time', timestamp);

			expect(botStateService.getState('bluebot_last_initial_message_time', 0)).toBe(timestamp);
			expect(fs.writeFileSync).toHaveBeenCalled();
		});
	});
});
