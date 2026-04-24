/**
 * Vitest configuration for pipeline tests.
 *
 * Pipeline tests exercise the real audio stack without a Discord connection:
 *   binaries → yt-dlp stream → demuxProbe/AudioResource → DJCova.play()
 *
 * These tests require:
 *   - yt-dlp installed (system or YTDLP_PATH env)
 *   - Network access to YouTube
 *   - ffmpeg (bundled via ffmpeg-static)
 *
 * Skip network tests: SKIP_NETWORK_TESTS=true npm run test:pipeline
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@starbunk/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/pipeline/**/*.pipeline.test.ts'],
    // Long timeout for network operations (yt-dlp can take ~10s to start streaming)
    testTimeout: 60_000,
    hookTimeout: 15_000,
    // Run tests sequentially — each test spawns yt-dlp/ffmpeg processes and
    // parallel execution can saturate resources and cause false failures.
    pool: 'forks',
    singleFork: true,
    // Reporter with verbose output so pipeline failures are easy to diagnose
    reporter: 'verbose',
  },
});
