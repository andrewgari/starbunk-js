/**
 * Memory leak prevention tests for DJCova event listener cleanup
 */

import { vi } from 'vitest';
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
		idleTimeoutSeconds: 2,
	}),
}));

vi.mock('../src/utils/ytdlp', () => ({
	getYouTubeAudioStream: vi.fn(),
}));

describe('DJCova Memory Leak Prevention', () => {
	let djCova: DJCova;

	beforeEach(() => {
		vi.clearAllMocks();
		djCova = new DJCova();
	});

	afterEach(() => {
		djCova.destroy();
	});

	describe('Event Listener Cleanup', () => {
		it('should properly remove all event listeners on destroy', () => {
			// Get the audio player
			const audioPlayer = djCova.getPlayer();

			// Verify that event listeners are registered
			const initialListenerCount =
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			expect(initialListenerCount).toBeGreaterThan(0);

			// Spy on removeAllListeners
			const removeAllListenersSpy = vi.spyOn(audioPlayer, 'removeAllListeners');

			// Destroy the DJCova instance
			djCova.destroy();

			// Verify that removeAllListeners was called
			expect(removeAllListenersSpy).toHaveBeenCalled();

			// Verify all listeners are removed
			const finalListenerCount =
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			expect(finalListenerCount).toBe(0);
		});

		it('should handle destroy() when no idle manager is initialized', () => {
			// Destroy should not throw an error even without idle manager
			expect(() => djCova.destroy()).not.toThrow();
		});

		it('should handle multiple destroy() calls gracefully', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// First destroy
			expect(() => djCova.destroy()).not.toThrow();

			// Second destroy should also not throw
			expect(() => djCova.destroy()).not.toThrow();
		});

		it('should cleanup idle manager on destroy', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// Access private property to verify idle manager exists
			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager).not.toBeNull();

			// Destroy the DJCova instance
			djCova.destroy();

			// Verify idle manager is cleaned up
			expect(djCovaAny.idleManager).toBeNull();
		});

		it('should cleanup ytdlp process on destroy', () => {
			// Access private property
			const djCovaAny = djCova as any;

			// Mock a ytdlp process
			const mockProcess = {
				kill: vi.fn(),
			};
			djCovaAny.ytdlpProcess = mockProcess;

			// Destroy should cleanup the process
			djCova.destroy();

			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
			expect(djCovaAny.ytdlpProcess).toBeNull();
		});
	});

	describe('Event Listener Functionality After Cleanup', () => {
		it('should not respond to events after destroy', () => {
			// Initialize idle management
			const mockCallback = vi.fn();
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockCallback);

			const audioPlayer = djCova.getPlayer();

			// Destroy the instance
			djCova.destroy();

			// Trigger events after destroy - should not cause side effects
			expect(() => {
				audioPlayer.emit(AudioPlayerStatus.Playing);
				audioPlayer.emit(AudioPlayerStatus.Idle);
			}).not.toThrow();

			// Callback should not have been called
			expect(mockCallback).not.toHaveBeenCalled();
		});

		it('should not have active idle manager after destroy', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// Trigger idle state
			const audioPlayer = djCova.getPlayer();
			audioPlayer.emit(AudioPlayerStatus.Idle);

			// Destroy the instance
			djCova.destroy();

			// Access private property to verify idle manager is null
			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager).toBeNull();
		});
	});
});
