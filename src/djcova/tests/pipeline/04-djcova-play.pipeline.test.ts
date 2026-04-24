/**
 * Pipeline Test Layer 4: DJCova Full Play Pipeline
 *
 * THE GOLD STANDARD TEST. Exercises the exact code path that runs in production.
 *
 * Flow under test:
 *   DJCova.play(url)
 *     → getYouTubeAudioStream()   [real yt-dlp]
 *     → demuxProbe()              [real audio format detection]
 *     → createAudioResource()     [real audio resource]
 *     → player.play(resource)
 *     → AudioPlayerStatus.Playing [real event from @discordjs/voice]
 *
 * What is mocked:
 *   - The PlayerSubscription (only to satisfy DJCova's "no subscription" diagnostic)
 *   - Nothing else
 *
 * What is NOT mocked:
 *   - yt-dlp process
 *   - Audio stream
 *   - demuxProbe
 *   - createAudioResource
 *   - AudioPlayer state machine
 *
 * Why no Discord connection is needed:
 *   DJCova is created with NoSubscriberBehavior.Play, meaning the AudioPlayer
 *   reads and processes audio frames even with no real voice connection. The
 *   Playing event fires when the player starts consuming frames — which happens
 *   without a Discord UDP connection. Audio bytes are read and discarded.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import { DJCova } from '../../src/core/dj-cova';
import ffmpegStaticPath from 'ffmpeg-static';

// Must be set before DJCova constructor runs (it checks this env var)
if (ffmpegStaticPath && !process.env.FFMPEG_PATH) {
  process.env.FFMPEG_PATH = ffmpegStaticPath;
}

// ---------------------------------------------------------------------------
// "Me at the zoo" — first YouTube video, 19s, extremely stable
// ---------------------------------------------------------------------------
const STABLE_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const PLAY_TIMEOUT_MS = 35_000;

const skipNetworkTests = process.env.SKIP_NETWORK_TESTS === 'true';

// ---------------------------------------------------------------------------
// Minimal fake subscription
// Only satisfies DJCova's subscription diagnostic check in the Playing event handler.
// Does NOT create a real Discord voice connection.
// ---------------------------------------------------------------------------
function fakeSubscription() {
  return {
    connection: {
      state: { status: VoiceConnectionStatus.Ready },
    },
    unsubscribe: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(skipNetworkTests)('Layer 4: DJCova Full Play Pipeline', () => {
  const instances: DJCova[] = [];

  function createDJCova(): DJCova {
    const dj = new DJCova();
    instances.push(dj);
    return dj;
  }

  afterEach(() => {
    for (const dj of instances.splice(0)) {
      try {
        dj.destroy();
      } catch {
        // already destroyed
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Core: does play() work at all?
  // ---------------------------------------------------------------------------

  it(
    'DJCova.play() transitions the AudioPlayer to Playing state',
    async () => {
      const dj = createDJCova();
      dj.setSubscription(fakeSubscription() as Parameters<typeof dj.setSubscription>[0]);

      const playingPromise = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                'AudioPlayer never reached Playing state. ' +
                  'This means yt-dlp, ffmpeg, or @discordjs/voice audio pipeline is broken.',
              ),
            ),
          PLAY_TIMEOUT_MS,
        );

        dj.getPlayer().on(AudioPlayerStatus.Playing, () => {
          clearTimeout(timer);
          resolve();
        });

        dj.getPlayer().on('error', err => {
          clearTimeout(timer);
          reject(new Error(`AudioPlayer error: ${err.message}`));
        });
      });

      // This call returns when player.play(resource) is invoked, before the
      // Playing event fires. The Playing event fires asynchronously once the
      // AudioPlayer starts consuming frames.
      await dj.play(STABLE_VIDEO_URL);

      await playingPromise;

      expect(dj.getPlayer().state.status).toBe(AudioPlayerStatus.Playing);
      console.log('  ✅ AudioPlayer reached Playing state — pipeline is fully operational');
    },
    PLAY_TIMEOUT_MS + 5_000,
  );

  // ---------------------------------------------------------------------------
  // Volume control works during active playback
  // ---------------------------------------------------------------------------

  it(
    'DJCova.setVolume() modifies volume on the active audio resource',
    async () => {
      const dj = createDJCova();
      dj.setSubscription(fakeSubscription() as Parameters<typeof dj.setSubscription>[0]);

      await dj.play(STABLE_VIDEO_URL);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Timeout waiting for Playing')),
          PLAY_TIMEOUT_MS,
        );
        dj.getPlayer().on(AudioPlayerStatus.Playing, () => {
          clearTimeout(timer);
          resolve();
        });
      });

      // Volume control must not throw and must persist
      dj.setVolume(50);
      expect(dj.getVolume()).toBe(50);

      dj.setVolume(0);
      expect(dj.getVolume()).toBe(0);

      dj.setVolume(100);
      expect(dj.getVolume()).toBe(100);

      console.log('  ✅ Volume control works during active playback');
    },
    PLAY_TIMEOUT_MS + 5_000,
  );

  // ---------------------------------------------------------------------------
  // stop() transitions player back to Idle
  // ---------------------------------------------------------------------------

  it(
    'DJCova.stop() transitions the AudioPlayer to Idle',
    async () => {
      const dj = createDJCova();
      dj.setSubscription(fakeSubscription() as Parameters<typeof dj.setSubscription>[0]);

      await dj.play(STABLE_VIDEO_URL);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Timeout waiting for Playing')),
          PLAY_TIMEOUT_MS,
        );
        dj.getPlayer().on(AudioPlayerStatus.Playing, () => {
          clearTimeout(timer);
          resolve();
        });
      });

      const idlePromise = new Promise<void>(resolve => {
        dj.getPlayer().once(AudioPlayerStatus.Idle, () => resolve());
      });

      dj.stop();
      await idlePromise;

      expect(dj.getPlayer().state.status).toBe(AudioPlayerStatus.Idle);
      console.log('  ✅ DJCova.stop() cleanly transitioned player to Idle');
    },
    PLAY_TIMEOUT_MS + 5_000,
  );

  // ---------------------------------------------------------------------------
  // Consecutive play() calls (track skip)
  // ---------------------------------------------------------------------------

  it(
    'a second play() call interrupts the first and reaches Playing again',
    async () => {
      const dj = createDJCova();
      dj.setSubscription(fakeSubscription() as Parameters<typeof dj.setSubscription>[0]);

      // First play
      await dj.play(STABLE_VIDEO_URL);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout on first play')), PLAY_TIMEOUT_MS);
        dj.getPlayer().on(AudioPlayerStatus.Playing, () => {
          clearTimeout(timer);
          resolve();
        });
      });

      // Second play — simulates a /play command while already playing
      const playingAgain = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('AudioPlayer did not reach Playing on second call')),
          PLAY_TIMEOUT_MS,
        );
        // once() avoids double-resolve from the first play() events still in flight
        dj.getPlayer().once(AudioPlayerStatus.Playing, () => {
          clearTimeout(timer);
          resolve();
        });
      });

      await dj.play(STABLE_VIDEO_URL);
      await playingAgain;

      expect(dj.getPlayer().state.status).toBe(AudioPlayerStatus.Playing);
      console.log('  ✅ Second play() successfully interrupted first and reached Playing');
    },
    (PLAY_TIMEOUT_MS + 5_000) * 2,
  );

  // ---------------------------------------------------------------------------
  // Graceful termination for unavailable video
  //
  // When yt-dlp fetches an unavailable video, it may write a few initial bytes
  // before the process exits with code 1. The yt-dlp exit error is logged but
  // the stream error does not always propagate back through the demuxProbe/ffmpeg
  // pipeline to the AudioPlayer's "error" event — the player may simply reach
  // Idle when the (partial) stream ends.
  //
  // KNOWN GAP: users may not receive an explicit error message in this scenario.
  // This test verifies the minimum contract: DJCova does NOT hang indefinitely.
  // ---------------------------------------------------------------------------

  it('DJCova does not hang indefinitely for an unavailable video', async () => {
    const dj = createDJCova();
    dj.setSubscription(fakeSubscription() as Parameters<typeof dj.setSubscription>[0]);

    const terminalStatePromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              'DJCova hung for 30s on invalid video — player never reached a terminal state',
            ),
          ),
        30_000,
      );

      const done = (state: string) => {
        clearTimeout(timer);
        resolve(state);
      };

      dj.getPlayer().on('error', () => done('error'));
      dj.getPlayer().once(AudioPlayerStatus.Idle, () => done('idle'));
    });

    let playRejected = false;
    try {
      await dj.play('https://www.youtube.com/watch?v=THIS_DOES_NOT_EXIST_XYZ');
    } catch {
      playRejected = true;
    }

    if (playRejected) {
      console.log('  ✅ play() rejected early for unavailable video');
      return;
    }

    // play() resolved — wait for the player to reach a terminal state
    const terminalState = await terminalStatePromise;

    expect(['error', 'idle']).toContain(terminalState);
    console.log(`  ✅ DJCova reached terminal state "${terminalState}" — did not hang`);
    if (terminalState === 'idle') {
      console.log(
        '  ⚠️  KNOWN GAP: error was not surfaced to the player — user may not see an error message',
      );
    }
  }, 35_000);
});
