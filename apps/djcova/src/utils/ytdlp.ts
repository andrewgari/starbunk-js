/**
 * yt-dlp wrapper for YouTube audio extraction
 * Uses the yt-dlp binary for reliable YouTube audio streaming
 */
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { logger } from '@starbunk/shared';

/**
 * Get audio stream from YouTube using yt-dlp
 * More reliable than ytdl-core and handles modern YouTube formats
 */
export function getYouTubeAudioStream(url: string): Readable {
	logger.debug(`Creating yt-dlp stream for: ${url}`);

	const ytdlpArgs = [
		url,
		'-f', 'bestaudio/best', // Get best audio quality
		'-o', '-', // Output to stdout
		'--no-playlist', // Don't download playlists
		'--no-warnings', // Suppress warnings
		'--quiet', // Quiet mode
		'--no-progress', // No progress bar
		'--extract-audio', // Extract audio
		'--audio-format', 'opus', // Prefer opus format for Discord
		'--audio-quality', '0', // Best quality
	];

	logger.debug(`Spawning yt-dlp with args: ${ytdlpArgs.join(' ')}`);

	const ytdlpProcess = spawn('yt-dlp', ytdlpArgs, {
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	// Log stderr for debugging
	ytdlpProcess.stderr.on('data', (data: Buffer) => {
		const message = data.toString().trim();
		if (message) {
			logger.debug(`yt-dlp stderr: ${message}`);
		}
	});

	ytdlpProcess.on('error', (error: Error) => {
		logger.error('yt-dlp process error:', error);
	});

	ytdlpProcess.on('exit', (code: number | null, signal: string | null) => {
		if (code !== 0 && code !== null) {
			logger.warn(`yt-dlp exited with code ${code}, signal: ${signal}`);
		}
	});

	// Return stdout stream
	return ytdlpProcess.stdout as Readable;
}

/**
 * Get video info from yt-dlp
 */
export async function getVideoInfo(url: string): Promise<{
	title: string;
	duration: number;
}> {
	return new Promise((resolve, reject) => {
		const ytdlpProcess = spawn('yt-dlp', [
			url,
			'--dump-json',
			'--no-playlist',
			'--no-warnings',
			'--quiet',
		]);

		let output = '';

		ytdlpProcess.stdout.on('data', (data: Buffer) => {
			output += data.toString();
		});

		ytdlpProcess.stderr.on('data', (data: Buffer) => {
			logger.debug(`yt-dlp info stderr: ${data.toString()}`);
		});

		ytdlpProcess.on('error', (error: Error) => {
			logger.error('Failed to get video info:', error);
			reject(error);
		});

		ytdlpProcess.on('close', (code: number | null) => {
			if (code !== 0) {
				reject(new Error(`yt-dlp exited with code ${code}`));
				return;
			}

			try {
				const info = JSON.parse(output);
				resolve({
					title: info.title || 'Unknown',
					duration: info.duration || 0,
				});
			} catch (error) {
				const parseError = error instanceof Error ? error : new Error(String(error));
				logger.error('Failed to parse yt-dlp JSON output:', parseError);
				reject(parseError);
			}
		});
	});
}
