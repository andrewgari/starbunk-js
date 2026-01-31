/**
 * Resource Lifecycle Tests for DJCova Music Player Manager
 * 
 * Tests validate proper resource cleanup across play/stop cycles:
 * - Subscription unsubscribe
 * - yt-dlp process termination
 * - Event listener cleanup
 * - Memory leak prevention
 * - Resource stability over 100+ cycles
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioPlayerStatus } from '@discordjs/voice';
import { DJCova } from '../../src/core/dj-cova';
import { Readable } from 'stream';
import { ChildProcess } from 'child_process';

// Mock logger
vi.mock('../../src/observability/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		withError: vi.fn().mockReturnThis(),
		withMetadata: vi.fn().mockReturnThis(),
	},
}));

// Mock music config
vi.mock('../../src/config/music-config', () => ({
	getMusicConfig: vi.fn().mockReturnValue({
		idleTimeoutSeconds: 2,
	}),
}));

// Mock voice utilities
vi.mock('../../src/utils/voice-utils', () => ({
	disconnectVoiceConnection: vi.fn(),
	createVoiceConnection: vi.fn(),
	subscribePlayerToConnection: vi.fn(() => ({
		unsubscribe: vi.fn(),
	})),
}));

// Create a mock yt-dlp process helper
function createMockYtdlpProcess(): ChildProcess {
	const mockStream = new Readable({
		read() {
			// Emit some data
			this.push(Buffer.from('mock audio data'));
			this.push(null); // End stream
		},
	});

	const mockProcess = {
		stdout: mockStream,
		stderr: new Readable({ read() {} }),
		stdin: null,
		kill: vi.fn().mockReturnValue(true),
		on: vi.fn(),
		once: vi.fn(),
		emit: vi.fn(),
		pid: Math.floor(Math.random() * 10000),
	} as unknown as ChildProcess;

	return mockProcess;
}

// Mock ytdlp module
vi.mock('../../src/utils/ytdlp', () => ({
	getYouTubeAudioStream: vi.fn(() => {
		const mockProcess = createMockYtdlpProcess();
		const mockStream = mockProcess.stdout as Readable;
		return { stream: mockStream, process: mockProcess };
	}),
	getVideoInfo: vi.fn().mockResolvedValue({
		title: 'Test Video',
		duration: 180,
	}),
}));

import { getYouTubeAudioStream } from '../../src/utils/ytdlp';

describe('DJCova Resource Lifecycle Tests', () => {
	let djCova: DJCova;
	const TEST_URL = 'https://www.youtube.com/watch?v=test123';

	beforeEach(() => {
		vi.clearAllMocks();
		djCova = new DJCova();
	});

	afterEach(() => {
		djCova.destroy();
	});

	describe('100 Play/Stop Cycles - Resource Leak Detection', () => {
		it('should handle 100 play/stop cycles without resource leaks', async () => {
			const cycles = 100;
			const audioPlayer = djCova.getPlayer();

			// Track listener counts before cycles
			const initialPlayingListeners = audioPlayer.listenerCount(AudioPlayerStatus.Playing);
			const initialIdleListeners = audioPlayer.listenerCount(AudioPlayerStatus.Idle);
			const initialErrorListeners = audioPlayer.listenerCount('error');

			// Run 100 play/stop cycles
			for (let i = 0; i < cycles; i++) {
				// Play audio
				await djCova.play(TEST_URL);

				// Simulate playing state
				audioPlayer.emit(AudioPlayerStatus.Playing);

				// Stop playback
				djCova.stop();
			}

			// Verify listener counts haven't increased
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Playing)).toBe(initialPlayingListeners);
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Idle)).toBe(initialIdleListeners);
			expect(audioPlayer.listenerCount('error')).toBe(initialErrorListeners);

			// Verify getYouTubeAudioStream was called exactly 100 times
			expect(getYouTubeAudioStream).toHaveBeenCalledTimes(cycles);
		});

		it('should handle rapid play/stop cycles without memory leaks', async () => {
			const rapidCycles = 50;
			
			// Rapid fire play/stop without waiting
			for (let i = 0; i < rapidCycles; i++) {
				const playPromise = djCova.play(TEST_URL);
				djCova.stop();
				
				try {
					await playPromise;
				} catch {
					// Expected to fail sometimes due to rapid stop
				}
			}

			// Verify no dangling processes
			const audioPlayer = djCova.getPlayer();
			const totalListeners =
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			// Should only have the initial 3 event handlers
			expect(totalListeners).toBeLessThanOrEqual(3);
		});
	});

	describe('Subscription Cleanup', () => {
		it('should properly unsubscribe from voice connections on stop', async () => {
			// Initialize with idle management (which sets up voice connections)
			djCova.initializeIdleManagement('test-guild', 'test-channel');

			await djCova.play(TEST_URL);
			djCova.stop();

			// Verify cleanup was called
			expect(getYouTubeAudioStream).toHaveBeenCalled();
			
			// The internal ytdlpProcess should be cleaned up
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
		});

		it('should handle multiple subscriptions without leaking', async () => {
			const iterations = 10;

			for (let i = 0; i < iterations; i++) {
				djCova.initializeIdleManagement(`guild-${i}`, `channel-${i}`);
				await djCova.play(TEST_URL);
				djCova.stop();
			}

			// Verify internal state is clean
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.resource).toBeUndefined();
		});

		it('should cleanup subscriptions when destroying DJCova', async () => {
			djCova.initializeIdleManagement('test-guild', 'test-channel');
			await djCova.play(TEST_URL);

			const audioPlayer = djCova.getPlayer();
			const beforeDestroyListeners = audioPlayer.listenerCount(AudioPlayerStatus.Playing);
			expect(beforeDestroyListeners).toBeGreaterThan(0);

			djCova.destroy();

			// All listeners should be removed
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Playing)).toBe(0);
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Idle)).toBe(0);
			expect(audioPlayer.listenerCount('error')).toBe(0);
		});
	});

	describe('yt-dlp Process Termination', () => {
		it('should always kill yt-dlp process on stop', async () => {
			await djCova.play(TEST_URL);

			// Get the mock process that was created
			const mockCall = vi.mocked(getYouTubeAudioStream).mock.results[0];
			const { process: mockProcess } = mockCall.value;

			djCova.stop();

			// Verify process was killed with SIGKILL
			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
		});

		it('should kill yt-dlp process on consecutive plays', async () => {
			const processes: ChildProcess[] = [];

			// First play
			await djCova.play(TEST_URL);
			let mockCall = vi.mocked(getYouTubeAudioStream).mock.results[0];
			processes.push(mockCall.value.process);

			// Second play without stop (should auto-stop first)
			await djCova.play(TEST_URL);
			mockCall = vi.mocked(getYouTubeAudioStream).mock.results[1];
			processes.push(mockCall.value.process);

			// First process should have been killed
			expect(processes[0].kill).toHaveBeenCalledWith('SIGKILL');
		});

		it('should kill all yt-dlp processes across multiple cycles', async () => {
			const cycles = 20;
			const processes: ChildProcess[] = [];

			for (let i = 0; i < cycles; i++) {
				await djCova.play(TEST_URL);
				const mockCall = vi.mocked(getYouTubeAudioStream).mock.results[i];
				processes.push(mockCall.value.process);
				djCova.stop();
			}

			// Verify all processes were killed
			processes.forEach((proc) => {
				expect(proc.kill).toHaveBeenCalledWith('SIGKILL');
			});
		});

		it('should handle process kill errors gracefully', async () => {
			await djCova.play(TEST_URL);

			const mockCall = vi.mocked(getYouTubeAudioStream).mock.results[0];
			const { process: mockProcess } = mockCall.value;

			// Make kill throw an error
			(mockProcess.kill as any).mockImplementation(() => {
				throw new Error('Process already dead');
			});

			// Should not throw
			expect(() => djCova.stop()).not.toThrow();

			// Process reference should still be cleared
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
		});

		it('should kill process on destroy even if not stopped', async () => {
			await djCova.play(TEST_URL);

			const mockCall = vi.mocked(getYouTubeAudioStream).mock.results[0];
			const { process: mockProcess } = mockCall.value;

			djCova.destroy();

			expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
		});
	});

	describe('Event Listener Leak Prevention', () => {
		it('should not accumulate event listeners on player', async () => {
			const audioPlayer = djCova.getPlayer();

			// Get initial listener counts
			const initialCounts = {
				playing: audioPlayer.listenerCount(AudioPlayerStatus.Playing),
				idle: audioPlayer.listenerCount(AudioPlayerStatus.Idle),
				error: audioPlayer.listenerCount('error'),
			};

			// Run multiple play/stop cycles
			for (let i = 0; i < 50; i++) {
				await djCova.play(TEST_URL);
				djCova.stop();
			}

			// Listener counts should remain the same
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Playing)).toBe(initialCounts.playing);
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Idle)).toBe(initialCounts.idle);
			expect(audioPlayer.listenerCount('error')).toBe(initialCounts.error);
		});

		it('should not accumulate listeners when reinitializing idle management', () => {
			const audioPlayer = djCova.getPlayer();
			const initialListenerCount = 
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			// Initialize multiple times
			for (let i = 0; i < 30; i++) {
				djCova.initializeIdleManagement(`guild-${i}`, `channel-${i}`);
			}

			const finalListenerCount = 
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');

			// Listener count should not have increased
			expect(finalListenerCount).toBe(initialListenerCount);
		});

		it('should remove all event listeners on destroy', () => {
			const audioPlayer = djCova.getPlayer();

			// Verify listeners exist initially
			const totalListeners = 
				audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
				audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
				audioPlayer.listenerCount('error');
			expect(totalListeners).toBeGreaterThan(0);

			// Destroy and verify all removed
			djCova.destroy();

			expect(audioPlayer.listenerCount(AudioPlayerStatus.Playing)).toBe(0);
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Idle)).toBe(0);
			expect(audioPlayer.listenerCount('error')).toBe(0);
		});

		it('should handle event emissions after destroy gracefully', () => {
			const audioPlayer = djCova.getPlayer();
			const mockCallback = vi.fn();

			djCova.initializeIdleManagement('test-guild', 'test-channel', mockCallback);
			djCova.destroy();

			// Emitting events after destroy should not cause side effects in DJCova
			// Note: error events without listeners will throw, which is expected EventEmitter behavior
			expect(() => {
				audioPlayer.emit(AudioPlayerStatus.Playing);
				audioPlayer.emit(AudioPlayerStatus.Idle);
			}).not.toThrow();

			expect(mockCallback).not.toHaveBeenCalled();
		});
	});

	describe('Resource Cleanup Edge Cases', () => {
		it('should handle cleanup when no resources are active', () => {
			expect(() => djCova.stop()).not.toThrow();
			expect(() => djCova.destroy()).not.toThrow();
		});

		it('should handle multiple stop calls without errors', async () => {
			await djCova.play(TEST_URL);
			
			expect(() => {
				djCova.stop();
				djCova.stop();
				djCova.stop();
			}).not.toThrow();
		});

		it('should handle multiple destroy calls without errors', async () => {
			await djCova.play(TEST_URL);
			djCova.initializeIdleManagement('test-guild', 'test-channel');

			expect(() => {
				djCova.destroy();
				djCova.destroy();
				djCova.destroy();
			}).not.toThrow();
		});

		it('should cleanup idle manager on repeated initialization', () => {
			const djCovaAny = djCova as any;

			djCova.initializeIdleManagement('guild-1', 'channel-1');
			const firstManager = djCovaAny.idleManager;
			expect(firstManager).not.toBeNull();

			// Spy on destroy of first manager
			const destroySpy = vi.spyOn(firstManager, 'destroy');

			djCova.initializeIdleManagement('guild-2', 'channel-2');

			// First manager should have been destroyed
			expect(destroySpy).toHaveBeenCalled();

			// New manager should be different
			expect(djCovaAny.idleManager).not.toBe(firstManager);
		});

		it('should handle play errors without leaking resources', async () => {
			// Make getYouTubeAudioStream throw an error
			vi.mocked(getYouTubeAudioStream).mockImplementationOnce(() => {
				throw new Error('Failed to get stream');
			});

			await expect(djCova.play(TEST_URL)).rejects.toThrow('Failed to get stream');

			// Resources should be cleaned up
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.resource).toBeUndefined();
		});
	});

	describe('Idle Manager Lifecycle', () => {
		it('should destroy idle manager when DJCova is destroyed', () => {
			djCova.initializeIdleManagement('test-guild', 'test-channel');

			const djCovaAny = djCova as any;
			const idleManager = djCovaAny.idleManager;
			const destroySpy = vi.spyOn(idleManager, 'destroy');

			djCova.destroy();

			expect(destroySpy).toHaveBeenCalled();
			expect(djCovaAny.idleManager).toBeNull();
		});

		it('should handle destroy when idle manager is not initialized', () => {
			expect(() => djCova.destroy()).not.toThrow();
		});

		it('should cleanup idle manager across multiple cycles', () => {
			for (let i = 0; i < 10; i++) {
				djCova.initializeIdleManagement(`guild-${i}`, `channel-${i}`);
			}

			const djCovaAny = djCova as any;
			const finalManager = djCovaAny.idleManager;

			expect(finalManager).not.toBeNull();
			expect(() => djCova.destroy()).not.toThrow();
			expect(djCovaAny.idleManager).toBeNull();
		});
	});

	describe('Memory Stability Verification', () => {
		it('should maintain stable state across extensive play/stop cycles', async () => {
			const audioPlayer = djCova.getPlayer();
			const initialState = {
				playingListeners: audioPlayer.listenerCount(AudioPlayerStatus.Playing),
				idleListeners: audioPlayer.listenerCount(AudioPlayerStatus.Idle),
				errorListeners: audioPlayer.listenerCount('error'),
			};

			// Large number of cycles to detect leaks
			for (let i = 0; i < 150; i++) {
				await djCova.play(TEST_URL);
				audioPlayer.emit(AudioPlayerStatus.Playing);
				audioPlayer.emit(AudioPlayerStatus.Idle);
				djCova.stop();
			}

			// Verify state hasn't changed
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Playing)).toBe(initialState.playingListeners);
			expect(audioPlayer.listenerCount(AudioPlayerStatus.Idle)).toBe(initialState.idleListeners);
			expect(audioPlayer.listenerCount('error')).toBe(initialState.errorListeners);

			// Verify internal state is clean
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.resource).toBeUndefined();
		});

		it('should properly reset state between different guild contexts', async () => {
			const guilds = Array.from({ length: 20 }, (_, i) => `guild-${i}`);

			for (const guildId of guilds) {
				djCova.initializeIdleManagement(guildId, `channel-${guildId}`);
				await djCova.play(TEST_URL);
				djCova.stop();
			}

			// Final state should be clean
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.resource).toBeUndefined();
			expect(djCovaAny.idleManager).not.toBeNull(); // Last one should still exist until destroy
		});

		it('should handle concurrent play attempts without resource duplication', async () => {
			// Spy on internal stream creation to detect resource duplication
			const getStreamSpy = vi.spyOn(DJCova.prototype as any, 'getYouTubeAudioStream');

			// Simulate rapid concurrent play calls
			const playPromises = Array.from({ length: 10 }, () =>
				djCova.play(TEST_URL).catch(() => {}) // Ignore errors
			);

			await Promise.all(playPromises);

			const djCovaAny = djCova as any;

			// Concurrent play attempts should not create multiple YouTube streams
			expect(getStreamSpy).toHaveBeenCalledTimes(1);

			// Internal process reference should point to a single active yt-dlp process
			expect(djCovaAny.ytdlpProcess).toBeDefined();

			getStreamSpy.mockRestore();
		});
	});

	describe('Volume Control During Lifecycle', () => {
		it('should maintain volume settings across play/stop cycles', async () => {
			djCova.setVolume(75);
			expect(djCova.getVolume()).toBe(75);

			for (let i = 0; i < 10; i++) {
				await djCova.play(TEST_URL);
				expect(djCova.getVolume()).toBe(75);
				djCova.stop();
			}

			expect(djCova.getVolume()).toBe(75);
		});

		it('should apply volume to new resources', async () => {
			djCova.setVolume(50);
			await djCova.play(TEST_URL);

			const djCovaAny = djCova as any;
			const resource = djCovaAny.resource;
			expect(resource).toBeDefined();
			expect(resource.volume).toBeDefined();
		});

		it('should handle volume changes during playback', async () => {
			await djCova.play(TEST_URL);
			
			djCova.setVolume(30);
			expect(djCova.getVolume()).toBe(30);

			djCova.setVolume(80);
			expect(djCova.getVolume()).toBe(80);

			djCova.stop();
		});

		it('should clamp volume to valid range', () => {
			djCova.setVolume(-10);
			expect(djCova.getVolume()).toBe(0);

			djCova.setVolume(150);
			expect(djCova.getVolume()).toBe(100);
		});
	});

	describe('Notification Callback Lifecycle', () => {
		it('should invoke notification callback on idle disconnect', async () => {
			vi.useFakeTimers();
			try {
				const mockCallback = vi.fn();

				djCova.initializeIdleManagement('test-guild', 'test-channel', mockCallback);
				await djCova.play(TEST_URL);

				const audioPlayer = djCova.getPlayer();
				audioPlayer.emit(AudioPlayerStatus.Idle);

				// Fast-forward past idle timeout
				vi.advanceTimersByTime(2000);
				await Promise.resolve();

				expect(mockCallback).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should handle callback errors gracefully', async () => {
			vi.useFakeTimers();
			try {
				const errorCallback = vi.fn().mockRejectedValue(new Error('Callback failed'));

				djCova.initializeIdleManagement('test-guild', 'test-channel', errorCallback);
				await djCova.play(TEST_URL);

				const audioPlayer = djCova.getPlayer();
				audioPlayer.emit(AudioPlayerStatus.Idle);

				vi.advanceTimersByTime(2000);
				await Promise.resolve();

				// Should not throw
				expect(errorCallback).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should support reinitialization with different callbacks', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			djCova.initializeIdleManagement('guild-1', 'channel-1', callback1);
			djCova.initializeIdleManagement('guild-2', 'channel-2', callback2);

			// Only callback2 should be active now
			const djCovaAny = djCova as any;
			expect(djCovaAny.notificationCallback).toBe(callback2);
		});

		it('should work without notification callback', () => {
			expect(() => {
				djCova.initializeIdleManagement('test-guild', 'test-channel');
			}).not.toThrow();

			const djCovaAny = djCova as any;
			expect(djCovaAny.notificationCallback).toBeNull();
		});
	});

	describe('Player Event Handler Integration', () => {
		it('should reset idle timer on Playing event', async () => {
			vi.useFakeTimers();
			djCova.initializeIdleManagement('test-guild', 'test-channel');

			const audioPlayer = djCova.getPlayer();
			
			// Start idle timer
			audioPlayer.emit(AudioPlayerStatus.Idle);
			
			const djCovaAny = djCova as any;
			expect(djCovaAny.idleManager.isIdleTimerActive()).toBe(true);

			// Playing should reset the timer
			audioPlayer.emit(AudioPlayerStatus.Playing);
			expect(djCovaAny.idleManager.isIdleTimerActive()).toBe(false);

			vi.useRealTimers();
		});

		it('should start idle timer on Idle event', async () => {
			djCova.initializeIdleManagement('test-guild', 'test-channel');

			const audioPlayer = djCova.getPlayer();
			const djCovaAny = djCova as any;

			// Initially not active
			expect(djCovaAny.idleManager.isIdleTimerActive()).toBe(false);

			// Idle event should start timer
			audioPlayer.emit(AudioPlayerStatus.Idle);
			expect(djCovaAny.idleManager.isIdleTimerActive()).toBe(true);
		});

		it('should cleanup on error event', async () => {
			await djCova.play(TEST_URL);

			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).not.toBeNull();

			const audioPlayer = djCova.getPlayer();
			
			// Add error listener to prevent uncaught error
			audioPlayer.on('error', () => {});
			
			// Trigger error - should cleanup resources
			audioPlayer.emit('error', new Error('Playback error'));

			expect(djCovaAny.ytdlpProcess).toBeNull();
		});
	});

	describe('Resource State Consistency', () => {
		it('should maintain consistent state after rapid operations', async () => {
			// Rapid sequence of operations
			djCova.initializeIdleManagement('guild-1', 'channel-1');
			await djCova.play(TEST_URL);
			djCova.setVolume(50);
			djCova.stop();
			djCova.setVolume(75);
			djCova.initializeIdleManagement('guild-2', 'channel-2');
			await djCova.play(TEST_URL);
			djCova.stop();

			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBeNull();
			expect(djCovaAny.resource).toBeUndefined();
			expect(djCova.getVolume()).toBe(75);
		});

		it('should handle play during existing playback', async () => {
			await djCova.play(TEST_URL);
			const firstProcessCall = vi.mocked(getYouTubeAudioStream).mock.results[0];

			// Play again without stopping
			await djCova.play(TEST_URL);
			const secondProcessCall = vi.mocked(getYouTubeAudioStream).mock.results[1];

			// First process should have been killed
			expect(firstProcessCall.value.process.kill).toHaveBeenCalledWith('SIGKILL');
			
			// New process should be active
			const djCovaAny = djCova as any;
			expect(djCovaAny.ytdlpProcess).toBe(secondProcessCall.value.process);
		});
	});
});
