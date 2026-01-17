/**
 * Integration tests for yt-dlp functionality
 * These tests actually call yt-dlp and require:
 * 1. yt-dlp to be installed on the system
 * 2. Network access to YouTube
 * 
 * Run with: npm test -- ytdlp-integration.test.ts
 * Skip in CI by setting: SKIP_YTDLP_TESTS=true
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { getYouTubeAudioStream, getVideoInfo } from '../src/utils/ytdlp';

// Test video: YouTube's official test video (short and reliable)
// This is a 10-second video that's unlikely to be removed
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const TEST_VIDEO_TITLE = 'Me at the zoo';

// Track spawned processes for cleanup
const activeProcesses: ReturnType<typeof spawn>[] = [];

// Check if yt-dlp is available
async function isYtDlpAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		const process = spawn('yt-dlp', ['--version']);
		process.on('error', () => resolve(false));
		process.on('close', (code) => resolve(code === 0));
		setTimeout(() => {
			process.kill();
			resolve(false);
		}, 5000);
	});
}

describe('yt-dlp Integration Tests', () => {
	let ytdlpAvailable = false;

	beforeAll(async () => {
		// Skip tests if SKIP_YTDLP_TESTS is set or yt-dlp is not available
		if (process.env.SKIP_YTDLP_TESTS === 'true') {
			console.log('⏭️  Skipping yt-dlp integration tests (SKIP_YTDLP_TESTS=true)');
			return;
		}

		ytdlpAvailable = await isYtDlpAvailable();
		if (!ytdlpAvailable) {
			console.log('⏭️  Skipping yt-dlp integration tests (yt-dlp not found)');
		}
	}, 10000);

	afterEach(() => {
		// Cleanup any active processes
		activeProcesses.forEach((proc) => {
			try {
				proc.kill('SIGKILL');
			} catch (e) {
				// Process may already be dead
			}
		});
		activeProcesses.length = 0;
	});

	describe('getVideoInfo', () => {
		it('should fetch video metadata from YouTube', async () => {
			if (!ytdlpAvailable) {
				console.log('⏭️  Test skipped: yt-dlp not available');
				return;
			}

			const info = await getVideoInfo(TEST_VIDEO_URL);

			expect(info).toBeDefined();
			expect(info.title).toBe(TEST_VIDEO_TITLE);
			expect(info.duration).toBeGreaterThan(0);
			expect(info.duration).toBeLessThan(30); // Should be a short video
		}, 30000); // 30 second timeout for network request

		it('should reject invalid YouTube URLs', async () => {
			if (!ytdlpAvailable) {
				console.log('⏭️  Test skipped: yt-dlp not available');
				return;
			}

			await expect(getVideoInfo('https://invalid-url.com')).rejects.toThrow();
		}, 30000);
	});

	describe('getYouTubeAudioStream', () => {
		it('should create a readable stream from YouTube video', async () => {
			if (!ytdlpAvailable) {
				console.log('⏭️  Test skipped: yt-dlp not available');
				return;
			}

			const { stream, process } = getYouTubeAudioStream(TEST_VIDEO_URL);
			activeProcesses.push(process);

			// Wait for stream to start producing data
			const dataReceived = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => {
					resolve(false);
				}, 30000); // 30 second timeout

				stream.once('data', (chunk) => {
					clearTimeout(timeout);
					expect(chunk).toBeDefined();
					expect(chunk.length).toBeGreaterThan(0);
					resolve(true);
				});

				stream.once('error', (error) => {
					clearTimeout(timeout);
					console.error('Stream error:', error);
					resolve(false);
				});

				process.once('error', (error) => {
					clearTimeout(timeout);
					console.error('Process error:', error);
					resolve(false);
				});
			});

			expect(dataReceived).toBe(true);

			// Cleanup
			stream.destroy();
			process.kill('SIGKILL');
		}, 35000);

		it('should handle stream errors gracefully', async () => {
			if (!ytdlpAvailable) {
				console.log('⏭️  Test skipped: yt-dlp not available');
				return;
			}

			const { stream, process } = getYouTubeAudioStream('https://www.youtube.com/watch?v=invalid');
			activeProcesses.push(process);

			// Wait for error
			const errorReceived = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => {
					resolve(false);
				}, 30000);

				stream.once('error', () => {
					clearTimeout(timeout);
					resolve(true);
				});

				// Also check if process exits with error
				process.once('exit', (code) => {
					if (code !== 0) {
						clearTimeout(timeout);
						resolve(true);
					}
				});
			});

			expect(errorReceived).toBe(true);

			// Cleanup
			stream.destroy();
			process.kill('SIGKILL');
		}, 35000);
	});
});

