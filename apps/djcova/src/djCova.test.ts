import { DJCova } from './djCova';
import { getYouTubeAudioStream, getVideoInfo } from './utils/ytdlp';
import { Readable } from 'stream';

const mockReadable = new Readable();
mockReadable._read = () => {};

jest.mock('./utils/ytdlp', () => ({
  getYouTubeAudioStream: jest.fn(() => ({ stream: mockReadable, process: { kill: jest.fn() } })),
  getVideoInfo: jest.fn(() => Promise.resolve({ title: 'test', duration: 123 })),
}));

describe('DJCova', () => {
  let djCova: DJCova;

  beforeEach(() => {
    djCova = new DJCova();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should throw an error for an invalid YouTube URL', async () => {
      const invalidUrl = 'https://example.com';
      await expect(djCova.start(invalidUrl)).rejects.toThrow('Invalid YouTube URL provided.');
    });
  });

  describe('stop', () => {
    it('should kill the ytdlpProcess', async () => {
      const mockProcess = { kill: jest.fn() };
      (getYouTubeAudioStream as jest.Mock).mockReturnValue({ stream: new Readable(), process: mockProcess });

      await djCova.start('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      djCova.stop();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('destroy', () => {
    it('should kill the ytdlpProcess', async () => {
      const mockProcess = { kill: jest.fn() };
      (getYouTubeAudioStream as jest.Mock).mockReturnValue({ stream: new Readable(), process: mockProcess });

      await djCova.start('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      djCova.destroy();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });
});
