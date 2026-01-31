/**
 * yt-dlp wrapper for YouTube audio extraction
 * Uses the yt-dlp binary for reliable YouTube audio streaming
 */
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { logger } from '../observability/logger';

/**
 * Find yt-dlp binary path
 * Checks common installation locations
 */
function getYtDlpPath(): string {
  // Check environment variable first
  if (process.env.YTDLP_PATH && existsSync(process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }

  // Common installation paths to check
  const paths = [
    'yt-dlp', // Default - check PATH
    join(homedir(), '.local', 'bin', 'yt-dlp'), // pip install --user
    '/usr/local/bin/yt-dlp', // System install
    '/usr/bin/yt-dlp', // System install
  ];

  for (const path of paths) {
    // Skip checking existence for the generic 'yt-dlp' - let spawn handle it
    if (path === 'yt-dlp') {
      continue;
    }
    if (existsSync(path)) {
      logger.debug(`Found yt-dlp at: ${path}`);
      return path;
    }
  }

  // Default to 'yt-dlp' and let it fail if not found
  logger.debug('Using default yt-dlp command (relying on PATH)');
  return 'yt-dlp';
}

/**
 * Get audio stream from YouTube using yt-dlp
 * More reliable than ytdl-core and handles modern YouTube formats
 */
export function getYouTubeAudioStream(url: string): {
  stream: Readable;
  process: ReturnType<typeof spawn>;
} {
  logger.debug(`Creating yt-dlp stream for: ${url}`);

  const ytdlpPath = getYtDlpPath();
  const ytdlpArgs = [
    url,
    '-f',
    'ba[ext=m4a]/bestaudio/best', // 1. Prefer M4A, fallback to best audio/video
    '-o',
    '-', // 2. Stream to stdout
    '--no-playlist',
    '--quiet', // 3. Keep stdout clean of progress bars
    '--no-warnings',
    '--no-part', // 4. Disable .part files (not required when streaming to stdout)
  ];

  logger.debug(`Spawning yt-dlp with args: ${ytdlpArgs.join(' ')}`);

  const ytdlpProcess = spawn(ytdlpPath, ytdlpArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Create a readable stream wrapper that handles early errors
  const stream = ytdlpProcess.stdout as Readable;
  let stderrBuffer = '';
  let hasEmittedData = false;

  // Collect stderr for better error messages
  ytdlpProcess.stderr.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    stderrBuffer += message + '\n';
    if (message) {
      logger.debug(`yt-dlp stderr: ${message}`);
    }
  });

  // Handle process spawn errors
  ytdlpProcess.on('error', (error: Error) => {
    logger.withError(error).error('yt-dlp process spawn error');
    stream.destroy(error);
  });

  // Handle early process exits before stream starts
  ytdlpProcess.on('exit', (code: number | null, signal: string | null) => {
    if (code === null || code !== 0) {
      const stderrOutput = stderrBuffer.trim();
      logger.error(`yt-dlp exited with code ${code}, signal: ${signal}`);
      if (stderrOutput) {
        logger.error(`yt-dlp stderr output: ${stderrOutput}`);
      }

      // If the process exits with an error before emitting any data, emit error on stream
      if (!hasEmittedData) {
        const errorMessage = stderrOutput || `yt-dlp process failed with code ${code}`;
        stream.destroy(new Error(errorMessage));
      }
    }
  });

  // Propagate stdout errors for better diagnostics
  (ytdlpProcess.stdout as Readable).on('error', (e: Error) => {
    logger.withError(e).error('yt-dlp stdout error');
  });

  // Track when data starts flowing
  stream.on('data', () => {
    hasEmittedData = true;
  });

  // Return stdout stream
  return { stream, process: ytdlpProcess };
}

/**
 * Get video info from yt-dlp
 */
export async function getVideoInfo(url: string): Promise<{
  title: string;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 20000;
    const ytdlpPath = getYtDlpPath();
    const ytdlpProcess = spawn(ytdlpPath, [
      url,
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
    ]);

    const timer = setTimeout(() => {
      try {
        ytdlpProcess.kill('SIGKILL');
      } catch {}
      reject(new Error(`yt-dlp info timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    let output = '';

    ytdlpProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ytdlpProcess.stderr.on('data', (data: Buffer) => {
      logger.debug(`yt-dlp info stderr: ${data.toString()}`);
    });

    ytdlpProcess.on('error', (error: Error) => {
      clearTimeout(timer);
      logger.withError(error).error('Failed to get video info');
      reject(error);
    });

    ytdlpProcess.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (code === null || code !== 0) {
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
        logger.withError(parseError).error('Failed to parse yt-dlp JSON output');
        reject(parseError);
      }
    });
  });
}
