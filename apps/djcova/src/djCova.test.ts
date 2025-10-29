import { DJCova } from './djCova';
import { getYouTubeAudioStream, getVideoInfo } from './utils/ytdlp';
import { Readable } from 'stream';

jest.mock('./utils/ytdlp', () => ({
  getYouTubeAudioStream: jest.fn(),
  getVideoInfo: jest.fn(() => Promise.resolve({ title: 'test', duration: 123 })),
}));

describe('DJCova', () => {
  let djCova: DJCova;

  beforeEach(() => {
    djCova = new DJCova();
    jest.clearAllMocks();
  });

  afterEach(() => {
    djCova.destroy();
  });

  describe('start', () => {
    it('should throw an error for an invalid YouTube URL', async () => {
      const invalidUrl = 'https://example.com';
      await expect(djCova.start(invalidUrl)).rejects.toThrow('Invalid YouTube URL provided.');
    });
  });
});
