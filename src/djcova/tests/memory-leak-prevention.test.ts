/**
 * Memory leak prevention tests for DJCova event listener cleanup
 */

import { vi } from 'vitest';
import { AudioPlayerStatus } from '@discordjs/voice';
import { DJCova } from '../src/dj-cova';

// Mock dependencies
vi.mock('@starbunk/shared', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
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

// Mock ytdl-core
vi.mock('@distube/ytdl-core', () => {
	return vi.fn().mockImplementation(() => {
		const { Readable } = require('stream');
		return new Readable({
			read() {
				this.push(Buffer.alloc(1024));
			},
		});
	});
});

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
		it('should properly remove event listeners on destroy', () => {
			// Initialize idle management to set up event listeners
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// Get the audio player to spy on its methods
			const audioPlayer = djCova.getPlayer();
			const offSpy = vi.spyOn(audioPlayer, 'off');

			// Verify that event listeners are registered (by triggering them)
			const initialListenerCount =
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			expect(initialListenerCount).toBeGreaterThan(0);

			// Destroy the DJCova instance
			djCova.destroy();

			// Verify that off() was called for each event type
			expect(offSpy).toHaveBeenCalledWith(AudioPlayerStatus.Playing, expect.any(Function));
			expect(offSpy).toHaveBeenCalledWith(AudioPlayerStatus.Idle, expect.any(Function));
			expect(offSpy).toHaveBeenCalledWith('error', expect.any(Function));

			// Verify that off() was called exactly 3 times (once for each listener)
			expect(offSpy).toHaveBeenCalledTimes(3);
		});

		it('should handle destroy() when no listeners are registered', () => {
			// Don't initialize idle management, so no listeners are registered
			const audioPlayer = djCova.getPlayer();
			const offSpy = vi.spyOn(audioPlayer, 'off');

			// Destroy should not throw an error
			expect(() => djCova.destroy()).not.toThrow();

			// off() should still be called but with null listeners
			expect(offSpy).toHaveBeenCalledTimes(3);
		});

		it('should handle multiple destroy() calls gracefully', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			const audioPlayer = djCova.getPlayer();
			const offSpy = vi.spyOn(audioPlayer, 'off');

			// First destroy
			djCova.destroy();
			const firstCallCount = offSpy.mock.calls.length;

			// Second destroy should not add more calls
			djCova.destroy();
			const secondCallCount = offSpy.mock.calls.length;

			expect(secondCallCount).toBe(firstCallCount);
		});

		it('should set listener properties to null after cleanup', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// Access private properties through type assertion for testing
			const djCovaAny = djCova as any;

			// Verify listeners are initially set
			expect(djCovaAny.onPlayingListener).not.toBeNull();
			expect(djCovaAny.onIdleListener).not.toBeNull();
			expect(djCovaAny.onErrorListener).not.toBeNull();

			// Destroy the instance
			djCova.destroy();

			// Verify listeners are set to null
			expect(djCovaAny.onPlayingListener).toBeNull();
			expect(djCovaAny.onIdleListener).toBeNull();
			expect(djCovaAny.onErrorListener).toBeNull();
		});

		it('should cleanup idle manager on destroy', () => {
			// Initialize idle management
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id');

			// Get the idle manager and spy on its destroy method
			const idleStatus = djCova.getIdleStatus();
			expect(idleStatus).not.toBeNull();

			// Destroy the DJCova instance
			djCova.destroy();

			// Verify idle manager is cleaned up
			const statusAfterDestroy = djCova.getIdleStatus();
			expect(statusAfterDestroy).toBeNull();
		});
	});

	describe('Event Listener Functionality After Cleanup', () => {
		it('should not respond to events after destroy', () => {
			// Initialize idle management
			const mockCallback = vi.fn();
			djCova.initializeIdleManagement('test-guild-id', 'test-channel-id', mockCallback);

			const audioPlayer = djCova.getPlayer();

			// Trigger an event before destroy
			audioPlayer.emit(AudioPlayerStatus.Idle);

			// Should have idle status active
			let idleStatus = djCova.getIdleStatus();
			expect(idleStatus?.isActive).toBe(true);

			// Destroy the instance
			djCova.destroy();

			// Trigger non-error events after destroy - should not cause side effects
			expect(() => {
				audioPlayer.emit(AudioPlayerStatus.Playing);
				audioPlayer.emit(AudioPlayerStatus.Idle);
			}).not.toThrow();

			// Idle status should be null after destroy
			idleStatus = djCova.getIdleStatus();
			expect(idleStatus).toBeNull();

			// Note: We don't test error events after destroy because they become
			// unhandled events when the listener is removed, which is expected behavior
		});
	});
});
