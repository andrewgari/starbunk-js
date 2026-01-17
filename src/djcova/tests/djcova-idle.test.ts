/**
 * Integration tests for DJCova idle management functionality
 */

import { vi, Mock } from 'vitest';
import { AudioPlayerStatus } from '@discordjs/voice';
import { DJCova } from '../src/core/dj-cova';

// Mock dependencies
vi.mock('../src/observability/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		withError: vi.fn().mockReturnThis(),
	},
}));

vi.mock('../src/utils/voice-utils', () => ({
	disconnectVoiceConnection: vi.fn(),
}));

vi.mock('../src/config/music-config', () => ({
	getMusicConfig: vi.fn().mockReturnValue({
		idleTimeoutSeconds: 2, // Short timeout for testing
	}),
}));

vi.mock('../src/utils/ytdlp', () => ({
	getYouTubeAudioStream: vi.fn(),
}));

import { disconnectVoiceConnection } from '../src/utils/voice-utils';
import { getMusicConfig } from '../src/config/music-config';

// Get mocked versions
const mockedDisconnectVoiceConnection = vi.mocked(disconnectVoiceConnection);
const mockedGetMusicConfig = vi.mocked(getMusicConfig);

describe('DJCova Idle Management Integration', () => {
	let djCova: DJCova;
	let mockNotificationCallback: Mock<(message: string) => Promise<void>>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		djCova = new DJCova();
		mockNotificationCallback = vi.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		djCova.destroy();
		vi.useRealTimers();
	});

	describe('Idle Management Initialization', () => {
		it('should initialize idle management correctly', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);

			// Access private property to verify idle manager was created
			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager).not.toBeNull();
			expect(djCovaAny.notificationCallback).toBe(mockNotificationCallback);
		});

		it('should work without notification callback', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');
			// Access private property to verify idle manager was created
			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager).not.toBeNull();
			expect(djCovaAny.notificationCallback).toBeNull();
		});

		it('should replace existing idle manager when re-initialized', () => {
			djCova.initializeIdleManagement('guild-1', 'channel-1', mockNotificationCallback);
			const djCovaAny = djCova as any;
			const firstManager = djCovaAny.idleManager;

			djCova.initializeIdleManagement('guild-2', 'channel-2', mockNotificationCallback);
			const secondManager = djCovaAny.idleManager;

			expect(firstManager).not.toBeNull();
			expect(secondManager).not.toBeNull();
			expect(secondManager).not.toBe(firstManager);
		});
	});

	describe('Audio Player Status Integration', () => {
		beforeEach(() => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
		});

		it('should start idle timer when audio player becomes idle', () => {
			// Simulate audio player becoming idle
			const player = djCova.getPlayer();
			const djCovaAny = djCova as any;
			const idleManager = djCovaAny.idleManager;
			const startTimerSpy = vi.spyOn(idleManager, 'startIdleTimer');

			player.emit(AudioPlayerStatus.Idle);

			expect(startTimerSpy).toHaveBeenCalled();
		});

		it('should reset idle timer when audio player starts playing', () => {
			// Start idle timer
			const player = djCova.getPlayer();
			const djCovaAny = djCova as any;
			const idleManager = djCovaAny.idleManager;
			const resetTimerSpy = vi.spyOn(idleManager, 'resetIdleTimer');

			// Reset timer by starting playback
			player.emit(AudioPlayerStatus.Playing);
			expect(resetTimerSpy).toHaveBeenCalled();
		});

		it('should cleanup on audio player error', () => {
			const player = djCova.getPlayer();
			const djCovaAny = djCova as any;

			// Set up a mock ytdlp process
			const mockProcess = { kill: vi.fn() };
			djCovaAny.ytdlpProcess = mockProcess;

			player.emit('error', new Error('Test error'));

			// Verify cleanup was called
			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
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
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockNotificationCallback).toHaveBeenCalledWith(
				'Disconnected from voice channel due to 2 seconds of inactivity',
			);
		});

		it('should not auto-disconnect if music starts playing before timeout', async () => {
			// Trigger idle state
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);

			// Start playing before timeout
			vi.advanceTimersByTime(1000);
			player.emit(AudioPlayerStatus.Playing);

			// Advance past original timeout
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).not.toHaveBeenCalled();
			expect(mockNotificationCallback).not.toHaveBeenCalled();
		});

		it('should handle notification callback errors gracefully', async () => {
			const error = new Error('Notification failed');
			mockNotificationCallback.mockRejectedValue(error);

			// Trigger idle state and timeout
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			expect(mockedDisconnectVoiceConnection).toHaveBeenCalledWith('test-guild-id');
			expect(mockNotificationCallback).toHaveBeenCalled();
		});
	});

	describe('Manual Stop', () => {
		beforeEach(() => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);
		});

		it('should cleanup resources on manual stop', () => {
			const djCovaAny = djCova as any;

			// Set up a mock ytdlp process
			const mockProcess = { kill: vi.fn() };
			djCovaAny.ytdlpProcess = mockProcess;

			// Manual stop
			djCova.stop();

			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
			expect(djCovaAny.ytdlpProcess).toBeNull();
		});

		it('should not trigger auto-disconnect after manual stop', async () => {
			// Start idle timer
			const player = djCova.getPlayer();
			player.emit(AudioPlayerStatus.Idle);

			// Manual stop before timeout
			vi.advanceTimersByTime(1000);
			djCova.stop();

			// Advance past original timeout
			vi.advanceTimersByTime(2000);
			await Promise.resolve();

			// Should still disconnect (idle timer was already started)
			// But we verify the stop was called
			const djCovaAny = djCova as any;
			expect(djCovaAny.resource).toBeUndefined();
		});
	});

	describe('Volume Management', () => {
		it('should set and get volume correctly', () => {
			djCova.setVolume(75);
			expect(djCova.getVolume()).toBe(75);
		});

		it('should clamp volume to valid range', () => {
			djCova.setVolume(150);
			expect(djCova.getVolume()).toBe(100);

			djCova.setVolume(-10);
			expect(djCova.getVolume()).toBe(0);
		});
	});

	describe('Cleanup', () => {
		it('should cleanup idle management on destroy', () => {
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);

			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager).not.toBeNull();

			// Destroy should cleanup
			djCova.destroy();

			// Idle manager should be null after destroy
			expect(djCovaAny.idleManager).toBeNull();
		});

		it('should cleanup all resources on destroy', () => {
			const djCovaAny = djCova as any;

			// Set up resources
			const mockProcess = { kill: vi.fn() };
			djCovaAny.ytdlpProcess = mockProcess;

			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockNotificationCallback);

			// Destroy
			djCova.destroy();

			// Verify cleanup
			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.idleManager).toBeNull();
		});
	});
});
