import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

// Keep logger side effects out of tests
vi.mock('../src/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withError: vi.fn().mockReturnThis(),
  },
}));

vi.mock('child_process', () => ({
  // Provide a spy for spawn; we grab it via `vi.mocked(spawn)` after import.
  spawn: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: () => '/home/test',
}));

vi.mock('path', () => ({
  join: (...parts: string[]) => parts.join('/'),
}));

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { getYouTubeAudioStream, getVideoInfo } from '../src/utils/ytdlp';

const spawnMock = vi.mocked(spawn);

interface FakeChildProcess extends EventEmitter {
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
}

function createFakeProcess(): FakeChildProcess {
  const proc = new EventEmitter() as FakeChildProcess;
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.kill = vi.fn();
  return proc;
}

describe('ytdlp unit tests', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    vi.mocked(existsSync).mockReset();
    delete process.env.YTDLP_PATH;
  });

  it('getYouTubeAudioStream uses YTDLP_PATH when provided and handles early exit error', async () => {
    process.env.YTDLP_PATH = '/custom/yt-dlp';
    vi.mocked(existsSync).mockImplementation((p: string) => p === '/custom/yt-dlp');

    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc as any);

    const { stream } = getYouTubeAudioStream('https://example.com');

    expect(spawn).toHaveBeenCalledWith('/custom/yt-dlp', expect.any(Array), expect.any(Object));

    const errorPromise = new Promise<Error>(resolve => {
      stream.once('error', err => resolve(err as Error));
    });

    proc.stderr.emit('data', Buffer.from('fatal error'));
    proc.emit('exit', 1, null);

    const err = await errorPromise;
    expect(err.message).toContain('fatal error');
  });

  it('getYouTubeAudioStream falls back to default binary and propagates spawn errors', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc as any);

    const { stream } = getYouTubeAudioStream('https://example.com');

    expect(spawn).toHaveBeenCalledWith('yt-dlp', expect.any(Array), expect.any(Object));

    const error = new Error('spawn failed');
    const errorPromise = new Promise<Error>(resolve => {
      stream.once('error', err => resolve(err as Error));
    });

    proc.emit('error', error);
    const err = await errorPromise;
    expect(err).toBe(error);
  });

  it('getVideoInfo resolves with parsed data on success', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValueOnce(proc as any);

    const infoPromise = getVideoInfo('https://example.com');

    proc.stdout.emit('data', Buffer.from(JSON.stringify({ title: 'Test', duration: 42 })));
    proc.emit('close', 0);

    await expect(infoPromise).resolves.toEqual({ title: 'Test', duration: 42 });
  });

  it('getVideoInfo rejects when yt-dlp exits with non-zero code', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValueOnce(proc as any);

    const infoPromise = getVideoInfo('https://example.com');
    proc.emit('close', 1);

    await expect(infoPromise).rejects.toThrow('yt-dlp exited with code 1');
  });

  it('getVideoInfo rejects on JSON parse error', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValueOnce(proc as any);

    const infoPromise = getVideoInfo('https://example.com');
    proc.stdout.emit('data', Buffer.from('not-json'));
    proc.emit('close', 0);

    await expect(infoPromise).rejects.toBeInstanceOf(Error);
  });

  it('getVideoInfo rejects on timeout and kills the process', async () => {
    vi.useFakeTimers();
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValueOnce(proc as any);

    const infoPromise = getVideoInfo('https://example.com');
    // Attach rejection handlers before flushing timers to avoid unhandled rejections
    const expectation = expect(infoPromise).rejects.toThrow('yt-dlp info timeout after 20000ms');
    await vi.runOnlyPendingTimersAsync();
    await expectation;
    expect(proc.kill).toHaveBeenCalledWith('SIGKILL');

    vi.useRealTimers();
  });

  it('getVideoInfo rejects on process error and logs stderr output', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = createFakeProcess();
    spawnMock.mockReturnValueOnce(proc as any);

    const infoPromise = getVideoInfo('https://example.com');

    // Exercise stderr logging path
    proc.stderr.emit('data', Buffer.from('some warning'));

    const error = new Error('spawn error');
    const expectation = expect(infoPromise).rejects.toBe(error);
    proc.emit('error', error);
    await expectation;
  });
});
