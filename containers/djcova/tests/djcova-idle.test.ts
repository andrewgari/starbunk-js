/**
 * Integration tests for DJCova idle management functionality
 */

import { AudioPlayerStatus } from '@discordjs/voice';
import { DJCova } from '../src/djCova';

// Mock dependencies
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

jest.mock('../src/utils/voiceUtils', () => ({
	disconnectVoiceConnection: jest.fn()
}));

jest.mock('../src/config/musicConfig', () => ({
	getMusicConfig: jest.fn().mockReturnValue({
		idleTimeoutSeconds: 2 // Short timeout for testing
	})
}));

// Mock ytdl-core
jest.mock('@distube/ytdl-core', () => {
	return jest.fn().mockImplementation(() => {
		const { Readable } = require('stream');
		return new Readable({
			read() {
				this.push(Buffer.alloc(1024));
			}
		});
	});
});

import { disconnectVoiceConnection } from '../src/utils/voiceUtils';
import { getMusicConfig } from '../src/config/musicConfig';

describe('DJCova Idle Management Integration', () => {
	let djCova: DJCova;
	let mockNotificationCallback: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		
		djCova = new DJCova();
		mockNotificationCallback = jest.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		djCova.destroy();
		jest.useRealTimers();
	});

	describe('Idle Management Initialization', () => {
		it('should initialize idle management correctly', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
			
			const idleStatus = djCova.getIdleStatus();
			expect(idleStatus).not.toBeNull();
			expect(idleStatus!.timeoutSeconds).toBe(2);
			expect(idleStatus!.isActive).toBe(false);
		});

		it('should work without notification callback', () => {
			djCova.initializeIdleManagement('test-guild-id');
			
			const idleStatus = djCova.getIdleStatus();
			expect(idleStatus).not.toBeNull();
			expect(idleStatus!.timeoutSeconds).toBe(2);
		});

		it('should replace existing idle manager when re-initialized', () => {
			djCova.initializeIdleManagement('guild-1', 'channel-1', mockNotificationCallback);
			const firstStatus = djCova.getIdleStatus();
			
			djCova.initializeIdleManagement('guild-2', 'channel-2', mockNotificationCallback);
			const secondStatus = djCova.getIdleStatus();
			
			expect(firstStatus).not.toBeNull();
			expect(secondStatus).not.toBeNull();
			expect(secondStatus!.timeoutSeconds).toBe(2);
		});
	});

	describe('Audio Player Status Integration', () => {
		beforeEach(() => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
		});

		it('should start idle timer when audio player becomes idle', () => {
			// Simulate audio player becoming idle
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			
			const idleStatus = djCova.getIdleStatus();
			expect(idleStatus!.isActive).toBe(true);
		});

		it('should reset idle timer when audio player starts playing', () => {
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			expect(djCova.getIdleStatus()!.isActive).toBe(true);
			
			// Reset timer by starting playback
			player.emit(AudioPlayerStatus.Playing);
			expect(djCova.getIdleStatus()!.isActive).toBe(false);
		});

		it('should start idle timer on audio player error', () => {
			const player = djCova.getPlayer();
			player.emit('error', new Error('Test error'));
			
			const idleStatus = djCova.getIdleStatus();
			expect(idleStatus!.isActive).toBe(true);
		});
	});

	describe('Auto-disconnect Flow', () => {
		beforeEach(() => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
		});

		it('should auto-disconnect after idle timeout', async () => {
			// Trigger idle state
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			
			// Fast-forward past timeout
			jest.advanceTimersByTime(2000);
			await Promise.resolve();
			
			expect(disconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockNotificationCallback).toHaveBeenCalledWith(
				'🔇 Disconnected from voice channel due to 2 seconds of inactivity'
			);
		});

		it('should not auto-disconnect if music starts playing before timeout', async () => {
			// Trigger idle state
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			
			// Start playing before timeout
			jest.advanceTimersByTime(1000);
			player.emit(AudioPlayerStatus.Playing);
			
			// Advance past original timeout
			jest.advanceTimersByTime(2000);
			await Promise.resolve();
			
			expect(disconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockNotificationCallback).not.toHaveBeenCalled();
		});

		it('should handle notification callback errors gracefully', async () => {
			const error = new Error('Notification failed');
			mockNotificationCallback.mockRejectedValue(error);
			
			// Trigger idle state and timeout
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			jest.advanceTimersByTime(2000);
			await Promise.resolve();
			
			expect(disconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockNotificationCallback).toHaveBeenCalled();
		});
	});

	describe('Manual Disconnect', () => {
		beforeEach(() => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
		});

		it('should cancel idle timer on manual disconnect', () => {
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			expect(djCova.getIdleStatus()!.isActive).toBe(true);
			
			// Manual disconnect
			djCova.disconnect();
			
			expect(djCova.getIdleStatus()!.isActive).toBe(false);
		});

		it('should not trigger auto-disconnect after manual disconnect', async () => {
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			
			// Manual disconnect before timeout
			jest.advanceTimersByTime(1000);
			djCova.disconnect();
			
			// Advance past original timeout
			jest.advanceTimersByTime(2000);
			await Promise.resolve();
			
			expect(disconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockNotificationCallback).not.toHaveBeenCalled();
		});
	});

	describe('Status Reporting', () => {
		it('should return null status when idle management not initialized', () => {
			const status = djCova.getIdleStatus();
			expect(status).toBeNull();
		});

		it('should return correct status when initialized', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
			
			const status = djCova.getIdleStatus();
			expect(status).toEqual({
				isActive: false,
				timeoutSeconds: 2
			});
		});

		it('should return active status when timer is running', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
			
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			
			const status = djCova.getIdleStatus();
			expect(status).toEqual({
				isActive: true,
				timeoutSeconds: 2
			});
		});
	});

	describe('Cleanup', () => {
		it('should cleanup idle management on destroy', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
			
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			expect(djCova.getIdleStatus()!.isActive).toBe(true);
			
			// Destroy should cleanup
			djCova.destroy();
			
			// Status should be null after destroy
			const status = djCova.getIdleStatus();
			expect(status).toBeNull();
		});
	});
});
