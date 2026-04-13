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
import { DJCovaErrorCode } from '../errors';

/**
 * Find yt-dlp binary path
 * Checks common installation locations
 */
function getYtDlpPath(): string {
  // Check environment variable first
  if (process.env.YTDLP_PATH && existsSync(process.env.YTDLP_PATH)) {
    logger.debug(`Using YTDLP_PATH from env: ${process.env.YTDLP_PATH}`);
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
  logger.debug('Using default yt-dlp command (relying on PATH environment variable)');
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
  logger.info(`Creating yt-dlp stream for: ${url}`);

  const ytdlpPath = getYtDlpPath();
  logger.debug(`Using yt-dlp binary: ${ytdlpPath}`);

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

  if (!ytdlpProcess.pid) {
    logger
      .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_YTDLP_SPAWN_FAILED, url })
      .error('yt-dlp process failed to spawn (no PID assigned)');
  } else {
    logger.debug(`yt-dlp process spawned successfully with PID: ${ytdlpProcess.pid}`);
  }

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
    logger
      .withError(error)
      .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_YTDLP_SPAWN_FAILED, url })
      .error('yt-dlp process spawn error');
    stream.destroy(error);
  });

  // Handle process exit — propagate non-zero exits as stream errors
  ytdlpProcess.on('exit', (code: number | null, signal: string | null) => {
    logger.debug(
      `yt-dlp process exited: code=${code}, signal=${signal}, hasEmittedData=${hasEmittedData}`,
    );

    // Treat as an error if yt-dlp exited with a non-zero code OR was killed by
    // an unexpected signal.  We specifically exclude SIGKILL because that is the
    // signal DJCova uses when intentionally terminating the process; treating it
    // as an error here would cause spurious notifications on every track change.
    // Note: we cannot distinguish our own SIGKILL from a system OOM-kill (both
    // appear as signal='SIGKILL'), but that edge-case is acceptable — the stale
    // state will be cleaned up on the next /play invocation.
    const isUnexpectedExit =
      (code !== null && code !== 0) || (code === null && signal !== null && signal !== 'SIGKILL');

    if (isUnexpectedExit) {
      const stderrOutput = stderrBuffer.trim();
      // Truncate to 1000 chars so the message stays within Discord's 2000-char limit
      // when it is eventually forwarded to the user via notificationCallback.
      const errorMessage = (
        stderrOutput ||
        `yt-dlp process terminated unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'none'})`
      ).slice(0, 1000);
      logger
        .withMetadata({
          error_code: DJCovaErrorCode.DJCOVA_YTDLP_EXIT_ERROR,
          url,
          exit_code: code,
          signal,
        })
        .error(`yt-dlp terminated unexpectedly: ${errorMessage}`);
      // Destroy the stream regardless of whether data was already emitted —
      // a partial stream produces silence rather than a user-visible error.
      stream.destroy(new Error(errorMessage));
    }
  });

  // Propagate stdout errors for better diagnostics
  (ytdlpProcess.stdout as Readable).on('error', (e: Error) => {
    logger
      .withError(e)
      .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_AUDIO_STREAM_ERROR, url })
      .error('yt-dlp stdout error');
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
      logger
        .withMetadata({
          error_code: DJCovaErrorCode.DJCOVA_YTDLP_TIMEOUT,
          url,
          timeout_ms: timeoutMs,
        })
        .error(`yt-dlp info timed out after ${timeoutMs}ms`);
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
      logger
        .withError(error)
        .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_YTDLP_SPAWN_FAILED, url })
        .error('Failed to get video info');
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
        logger
          .withError(parseError)
          .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_YTDLP_CONTENT_ERROR, url })
          .error('Failed to parse yt-dlp JSON output');
        reject(parseError);
      }
    });
  });
}
