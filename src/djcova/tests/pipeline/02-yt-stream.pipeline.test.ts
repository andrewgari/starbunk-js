/**
 * Pipeline Test Layer 2: yt-dlp Stream Production
 *
 * Verifies that yt-dlp can actually fetch audio bytes from YouTube.
 * Requires network access. No Discord. No ffmpeg.
 *
 * Uses a known short, stable video (the first YouTube video — 19s).
 * If this fails, DJCova cannot stream audio regardless of any other fix.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { ChildProcess } from 'child_process';
import { getYouTubeAudioStream } from '../../src/utils/ytdlp';
import ffmpegStaticPath from 'ffmpeg-static';

// Set ffmpeg path so downstream @discordjs/voice probing works
if (ffmpegStaticPath && !process.env.FFMPEG_PATH) {
  process.env.FFMPEG_PATH = ffmpegStaticPath;
}

// "Me at the zoo" — first YouTube video, 19 seconds, extremely stable
const STABLE_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const STREAM_DATA_TIMEOUT_MS = 30_000;

const activeProcesses: ChildProcess[] = [];

function trackProcess(proc: ChildProcess): ChildProcess {
  activeProcesses.push(proc);
  return proc;
}

afterEach(() => {
  for (const proc of activeProcesses.splice(0)) {
    try {
      proc.kill('SIGKILL');
    } catch {
      // already dead
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Layer 2: yt-dlp Stream Production', () => {
  describe('successful stream', () => {
    it(
      'produces audio bytes from a known YouTube URL within 30 seconds',
      async () => {
        const { stream, process: proc } = getYouTubeAudioStream(STABLE_VIDEO_URL);
        trackProcess(proc);

        const bytesReceived = await new Promise<number>((resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error(
                  'No audio bytes received within timeout — yt-dlp may be broken or blocked',
                ),
              ),
            STREAM_DATA_TIMEOUT_MS,
          );

          let total = 0;

          stream.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total >= 4096) {
              // Got 4 KB — clearly working
              clearTimeout(timer);
              stream.destroy();
              resolve(total);
            }
          });

          stream.on('error', err => {
            clearTimeout(timer);
            reject(new Error(`Stream error: ${err.message}`));
          });

          proc.on('error', err => {
            clearTimeout(timer);
            reject(new Error(`yt-dlp spawn error: ${err.message}`));
          });
        });

        expect(bytesReceived).toBeGreaterThanOrEqual(4096);
        console.log(`  Received ${bytesReceived} bytes from yt-dlp`);
      },
      STREAM_DATA_TIMEOUT_MS + 5_000,
    );

    it('stream starts within a reasonable time (< 20s)', async () => {
      const startMs = Date.now();
      const { stream, process: proc } = getYouTubeAudioStream(STABLE_VIDEO_URL);
      trackProcess(proc);

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('First byte took > 20 seconds — yt-dlp is too slow')),
          20_000,
        );

        stream.once('data', () => {
          clearTimeout(timer);
          stream.destroy();
          resolve();
        });

        stream.once('error', err => {
          clearTimeout(timer);
          reject(err);
        });
      });

      const elapsedMs = Date.now() - startMs;
      console.log(`  First byte received after ${elapsedMs}ms`);
      expect(elapsedMs).toBeLessThan(20_000);
    }, 25_000);
  });

  describe('error handling', () => {
    it('emits a stream error for a non-existent video ID', async () => {
      const { stream, process: proc } = getYouTubeAudioStream(
        'https://www.youtube.com/watch?v=THIS_DOES_NOT_EXIST_XYZ',
      );
      trackProcess(proc);

      const gotError = await new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Expected an error for invalid video ID but got none')),
          30_000,
        );

        stream.once('error', () => {
          clearTimeout(timer);
          resolve(true);
        });

        // Also accept non-zero process exit as the error signal
        proc.once('exit', code => {
          if (code !== 0) {
            clearTimeout(timer);
            resolve(true);
          }
        });
      });

      expect(gotError).toBe(true);
    }, 35_000);
  });
});
