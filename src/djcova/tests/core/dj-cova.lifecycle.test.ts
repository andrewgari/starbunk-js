/**
 * Lifecycle stress tests for DJCova play/stop cycles
 */

import { vi } from 'vitest';
import { PassThrough } from 'stream';
import { DJCova } from '../../src/core/dj-cova';

// Mock yt-dlp integration to avoid spawning real processes or network calls
vi.mock('../../src/utils/ytdlp', () => ({
  getYouTubeAudioStream: vi.fn(() => ({
    stream: new PassThrough(),
    process: { kill: vi.fn() },
  })),
}));

// Stub demuxProbe from @discordjs/voice so play() can create an audio resource
// without performing a real probe. This also avoids ESM spy limitations by
// providing a mocked implementation at module load time.
vi.mock('@discordjs/voice', async importOriginal => {
  const actual = await importOriginal<typeof import('@discordjs/voice')>();

  return {
    ...actual,
    demuxProbe: vi.fn(async (stream: unknown) => ({
      stream,
      type: actual.StreamType.Opus,
    })),
  };
});

describe('DJCova Lifecycle - 100 play/stop cycles', () => {
  let djCova: DJCova;

  beforeEach(() => {
    vi.clearAllMocks();
    djCova = new DJCova();
  });

  afterEach(() => {
    djCova.destroy();
    vi.restoreAllMocks();
  });

  it('handles 100 sequential play/stop cycles without error', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    for (let i = 0; i < 100; i += 1) {
      await djCova.play(testUrl);
      djCova.stop();
    }
  });
});
