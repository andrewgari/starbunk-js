/**
 * Unit tests for IdleManager auto-disconnect functionality
 */

import { vi } from 'vitest';
import { IdleManager, createIdleManager, IdleManagerConfig } from '../src/services/idle-manager';

// Mock the voice utils
vi.mock('../src/utils/voice-utils', () => ({
	disconnectVoiceConnection: vi.fn(),
}));

// Mock the shared logger
vi.mock('@starbunk/shared', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import { disconnectVoiceConnection } from '../src/utils/voice-utils';
import { logger } from '@starbunk/shared';

// Get mocked versions
const mockedDisconnectVoiceConnection = vi.mocked(disconnectVoiceConnection);
const mockedLogger = vi.mocked(logger);

describe('IdleManager', () => {
	let idleManager: IdleManager;
	let mockOnDisconnect: ReturnType<typeof vi.fn>;
	let config: IdleManagerConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockOnDisconnect = vi.fn().mockResolvedValue(undefined);

		config = {
			timeoutSeconds: 2, // Short timeout for testing
			guildId: 'test-guild-id',
			channelId: 'test-channel-id',
			onDisconnect: mockOnDisconnect,
		};

		idleManager = new IdleManager(config);
	});

	afterEach(() => {
		idleManager.destroy();
		vi.useRealTimers();
	});

	describe('Timer Management', () => {
		it('should start idle timer', () => {
			expect(idleManager.isIdleTimerActive()).toBe(false);

			idleManager.startIdleTimer();

			expect(idleManager.isIdleTimerActive()).toBe(true);
		});

		it('should reset idle timer', () => {
			idleManager.startIdleTimer();
			expect(idleManager.isIdleTimerActive()).toBe(true);

			idleManager.resetIdleTimer();

			expect(idleManager.isIdleTimerActive()).toBe(false);
		});

		it('should cancel idle timer', () => {
			idleManager.startIdleTimer();
			expect(idleManager.isIdleTimerActive()).toBe(true);

			idleManager.cancelIdleTimer();

			expect(idleManager.isIdleTimerActive()).toBe(false);
		});

		it('should reset timer when starting while already active', () => {
			idleManager.startIdleTimer();
			expect(idleManager.isIdleTimerActive()).toBe(true);

			idleManager.startIdleTimer(); // Should reset, not create second timer

			expect(idleManager.isIdleTimerActive()).toBe(true);
		});
	});

	describe('Auto-disconnect Functionality', () => {
		it('should trigger auto-disconnect after timeout', async () => {
			idleManager.startIdleTimer();

			// Fast-forward time to trigger timeout
			vi.advanceTimersByTime(2000);

			// Wait for async operations to complete
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockOnDisconnect).toHaveBeenCalledWith(
				'Disconnected from voice channel due to 2 seconds of inactivity',
			);
			expect(idleManager.isIdleTimerActive()).toBe(false);
		});

		it('should not trigger auto-disconnect if timer is reset', async () => {
			idleManager.startIdleTimer();

			// Reset timer before timeout
			vi.advanceTimersByTime(1000);
			idleManager.resetIdleTimer();

			// Advance past original timeout
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockOnDisconnect).not.toHaveBeenCalled();
		});

		it('should not trigger auto-disconnect if timer is cancelled', async () => {
			idleManager.startIdleTimer();

			// Cancel timer before timeout
			vi.advanceTimersByTime(1000);
			idleManager.cancelIdleTimer();

			// Advance past original timeout
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockOnDisconnect).not.toHaveBeenCalled();
		});

		it('should handle errors during auto-disconnect gracefully', async () => {
			const error = new Error('Disconnect failed');
			(mockedDisconnectVoiceConnection).mockImplementation(() => {
				throw error;
			});

			idleManager.startIdleTimer();
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(logger.error).toHaveBeenCalledWith('Error handling idle timeout:', error);
			expect(idleManager.isIdleTimerActive()).toBe(false); // Should still clean up
		});
	});

	describe('Configuration', () => {
		it('should return correct timeout seconds', () => {
			expect(idleManager.getTimeoutSeconds()).toBe(2);
		});

		it('should update configuration', () => {
			idleManager.updateConfig({ timeoutSeconds: 5 });
			expect(idleManager.getTimeoutSeconds()).toBe(5);
		});

		it('should work without onDisconnect callback', async () => {
			const configWithoutCallback = {
				timeoutSeconds: 1,
				guildId: 'test-guild-id',
			};

			const managerWithoutCallback = new IdleManager(configWithoutCallback);
			managerWithoutCallback.startIdleTimer();

			vi.advanceTimersByTime(1000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');

			managerWithoutCallback.destroy();
		});
	});

	describe('Factory Function', () => {
		it('should create IdleManager instance', () => {
			const manager = createIdleManager(config);
			expect(manager).toBeInstanceOf(IdleManager);
			expect(manager.getTimeoutSeconds()).toBe(2);
			manager.destroy();
		});
	});

	describe('Cleanup', () => {
		it('should cleanup resources on destroy', () => {
			idleManager.startIdleTimer();
			expect(idleManager.isIdleTimerActive()).toBe(true);

			idleManager.destroy();

			expect(idleManager.isIdleTimerActive()).toBe(false);
		});
	});
});
