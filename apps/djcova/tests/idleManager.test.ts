/**
 * Unit tests for IdleManager auto-disconnect functionality
 */

import { IdleManager, createIdleManager, IdleManagerConfig } from '../src/services/idleManager';

// Mock the voice utils
jest.mock('../src/utils/voiceUtils', () => ({
	disconnectVoiceConnection: jest.fn(),
}));

// Mock the shared logger
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

import { disconnectVoiceConnection } from '../src/utils/voiceUtils';
import { logger } from '@starbunk/shared';

describe('IdleManager', () => {
	let idleManager: IdleManager;
	let mockOnDisconnect: jest.Mock;
	let config: IdleManagerConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		mockOnDisconnect = jest.fn().mockResolvedValue(undefined);

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
		jest.useRealTimers();
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
			jest.advanceTimersByTime(2000);

			// Wait for async operations to complete
			await Promise.resolve();

			expect(disconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockOnDisconnect).toHaveBeenCalledWith(
				'Disconnected from voice channel due to 2 seconds of inactivity',
			);
			expect(idleManager.isIdleTimerActive()).toBe(false);
		});

		it('should not trigger auto-disconnect if timer is reset', async () => {
			idleManager.startIdleTimer();

			// Reset timer before timeout
			jest.advanceTimersByTime(1000);
			idleManager.resetIdleTimer();

			// Advance past original timeout
			jest.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(disconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockOnDisconnect).not.toHaveBeenCalled();
		});

		it('should not trigger auto-disconnect if timer is cancelled', async () => {
			idleManager.startIdleTimer();

			// Cancel timer before timeout
			jest.advanceTimersByTime(1000);
			idleManager.cancelIdleTimer();

			// Advance past original timeout
			jest.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(disconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockOnDisconnect).not.toHaveBeenCalled();
		});

		it('should handle errors during auto-disconnect gracefully', async () => {
			const error = new Error('Disconnect failed');
			(disconnectVoiceConnection as jest.Mock).mockImplementation(() => {
				throw error;
			});

			idleManager.startIdleTimer();
			jest.advanceTimersByTime(2000);
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

			jest.advanceTimersByTime(1000);
			await Promise.resolve();

			expect(disconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');

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
