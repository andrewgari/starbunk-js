/**
 * Pipeline Test Layer 1: Binary Availability
 *
 * Verifies that all required external binaries are installed and functional.
 * NO network calls. NO Discord. Fast (<5s).
 *
 * If these fail, DJCova is fundamentally broken — fix binaries before anything else.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import ffmpegStaticPath from 'ffmpeg-static';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function runBinary(
  cmd: string,
  args: string[],
  timeoutMs = 5_000,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ code: -1, stdout, stderr: stderr + '\n[TIMEOUT]' });
    }, timeoutMs);

    proc.on('error', err => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: err.message });
    });

    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Layer 1: Binary Availability', () => {
  describe('yt-dlp', () => {
    it('is reachable and returns a version string', async () => {
      const ytdlpBin = process.env.YTDLP_PATH ?? 'yt-dlp';
      const result = await runBinary(ytdlpBin, ['--version']);

      expect(result.code, `yt-dlp exited with code ${result.code}. stderr: ${result.stderr}`).toBe(
        0,
      );

      // Version is YYYY.MM.DD format
      expect(result.stdout.trim()).toMatch(/^\d{4}\.\d{2}\.\d{2}/);
      console.log(`  yt-dlp version: ${result.stdout.trim()}`);
    });

    it('supports the output flags DJCova relies on', async () => {
      const ytdlpBin = process.env.YTDLP_PATH ?? 'yt-dlp';
      const result = await runBinary(ytdlpBin, ['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('--no-playlist');
      expect(result.stdout).toContain('--quiet');
    });
  });

  describe('ffmpeg (bundled via ffmpeg-static)', () => {
    it('ffmpeg-static provides a non-null path', () => {
      expect(
        ffmpegStaticPath,
        'ffmpeg-static returned null — package may be missing',
      ).not.toBeNull();
      console.log(`  ffmpeg-static path: ${ffmpegStaticPath}`);
    });

    it('the bundled ffmpeg binary exists on disk', () => {
      if (!ffmpegStaticPath) {
        console.warn('  ffmpeg-static path is null — skipping disk check');
        return;
      }
      expect(existsSync(ffmpegStaticPath), `ffmpeg binary not found at ${ffmpegStaticPath}`).toBe(
        true,
      );
    });

    it('the bundled ffmpeg binary is executable and reports a version', async () => {
      if (!ffmpegStaticPath) {
        console.warn('  ffmpeg-static not available — skipping version check');
        return;
      }
      const result = await runBinary(ffmpegStaticPath, ['-version']);
      const combined = result.stdout + result.stderr;

      expect(
        combined,
        `ffmpeg did not print a version string. combined output: ${combined}`,
      ).toMatch(/ffmpeg version/i);

      console.log(`  ffmpeg version: ${combined.split('\n')[0].trim()}`);
    });

    it('FFMPEG_PATH env is set by DJCova constructor (simulated here)', () => {
      // DJCova constructor does: process.env.FFMPEG_PATH = ffmpegPath
      // Simulate that here so downstream pipeline tests inherit it.
      if (ffmpegStaticPath && !process.env.FFMPEG_PATH) {
        process.env.FFMPEG_PATH = ffmpegStaticPath;
      }
      expect(process.env.FFMPEG_PATH).toBeDefined();
      console.log(`  FFMPEG_PATH: ${process.env.FFMPEG_PATH}`);
    });
  });

  describe('opusscript (Node.js native module)', () => {
    it('loads without errors', async () => {
      // opusscript is required by @discordjs/voice for Opus encoding.
      // If it fails to load, voice audio cannot be encoded and the bot will be silent.
      const mod = await import('opusscript');
      expect(mod).toBeDefined();
      // The default export is an Opus encoder class
      const defaultExport = mod.default ?? mod;
      expect(typeof defaultExport).toBe('function');
    });
  });
});
