/**
 * Pipeline Test Layer 3: Audio Resource Creation
 *
 * Verifies the full audio-processing chain:
 *   yt-dlp stdout → demuxProbe (format detection) → createAudioResource
 *
 * demuxProbe and createAudioResource are from @discordjs/voice but require
 * NO Discord connection — they are pure audio-stream operations.
 * FFmpeg is required for format transcoding (set via FFMPEG_PATH).
 *
 * If this test passes, the audio is in a state that is literally ready to
 * be subscribed to a Discord voice connection and transmitted.
 *
 * If the mocked unit tests pass but this fails, the real pipeline is broken.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { demuxProbe, createAudioResource, StreamType } from '@discordjs/voice';
import { ChildProcess } from 'child_process';
import { getYouTubeAudioStream } from '../../src/utils/ytdlp';
import ffmpegStaticPath from 'ffmpeg-static';

// Must be set before @discordjs/voice tries to use ffmpeg
if (ffmpegStaticPath && !process.env.FFMPEG_PATH) {
  process.env.FFMPEG_PATH = ffmpegStaticPath;
}

const STABLE_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const PROBE_TIMEOUT_MS = 35_000;

const skipNetworkTests = process.env.SKIP_NETWORK_TESTS === 'true';

const activeProcesses: ChildProcess[] = [];

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

describe.skipIf(skipNetworkTests)('Layer 3: Audio Resource Creation', () => {
  describe('demuxProbe', () => {
    it(
      'detects the audio format of a live yt-dlp stream',
      async () => {
        const { stream, process: proc } = getYouTubeAudioStream(STABLE_VIDEO_URL);
        activeProcesses.push(proc);

        const result = await demuxProbe(stream);

        expect(result, 'demuxProbe returned null/undefined').toBeDefined();
        expect(result.stream, 'probed stream is missing').toBeDefined();
        expect(result.type, 'probe type is missing').toBeDefined();

        // Cleanup the probed stream (otherwise the yt-dlp process keeps buffering)
        result.stream.destroy();

        console.log(`  Detected audio type: ${result.type}`);
      },
      PROBE_TIMEOUT_MS + 5_000,
    );
  });

  describe('createAudioResource', () => {
    it(
      'builds a playable AudioResource with inline volume from a yt-dlp stream',
      async () => {
        const { stream, process: proc } = getYouTubeAudioStream(STABLE_VIDEO_URL);
        activeProcesses.push(proc);

        const probeResult = await demuxProbe(stream);

        const resource = createAudioResource(probeResult.stream, {
          inputType: probeResult.type,
          inlineVolume: true,
        });

        expect(resource, 'createAudioResource returned null/undefined').toBeDefined();
        expect(resource.volume, 'inlineVolume not available on resource').toBeDefined();
        expect(resource.playbackDuration).toBe(0); // Not yet playing

        // Volume control must work — this is what DJCova.setVolume() relies on
        resource.volume!.setVolume(0.1);
        expect(resource.volume!.volume).toBeCloseTo(0.1, 2);

        resource.volume!.setVolume(1.0);
        expect(resource.volume!.volume).toBeCloseTo(1.0, 2);

        console.log(`  AudioResource created. probe type: ${probeResult.type}`);
        probeResult.stream.destroy();
      },
      PROBE_TIMEOUT_MS + 5_000,
    );

    it(
      'produces a resource with a readable stream type (not Arbitrary when possible)',
      async () => {
        const { stream, process: proc } = getYouTubeAudioStream(STABLE_VIDEO_URL);
        activeProcesses.push(proc);

        const probeResult = await demuxProbe(stream);

        // The type should be one of the known StreamTypes.
        // StreamType.Arbitrary means ffmpeg transcoding is required — acceptable,
        // but worth logging so we know what format YouTube is returning.
        const knownTypes = Object.values(StreamType);
        expect(knownTypes).toContain(probeResult.type);

        if (probeResult.type === StreamType.Arbitrary) {
          console.log('  Note: format is Arbitrary — ffmpeg transcoding will be used');
        } else {
          console.log(`  Optimal format: ${probeResult.type} (no transcoding needed)`);
        }

        probeResult.stream.destroy();
      },
      PROBE_TIMEOUT_MS + 5_000,
    );
  });
});
