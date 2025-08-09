import { CovaBotContainer } from '../index';
import { container, ServiceId, MessageFilter, resetMessageFilter } from '@starbunk/shared';

jest.mock('@starbunk/shared', () => {
  const actual = jest.requireActual('@starbunk/shared');
  return {
    ...actual,
    createDiscordClient: jest.fn(() => ({
      on: jest.fn(),
      once: jest.fn(),
      login: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('CovaBotContainer initialize()', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    // ensure clean container state
    container.clear();
    resetMessageFilter();
    process.env.NODE_ENV = 'test';
    process.env.DEBUG_MODE = 'true';
    // Use valid Discord snowflake IDs (18 digits)
    process.env.TESTING_CHANNEL_IDS = '123456789012345678';
    delete process.env.TESTING_SERVER_IDS;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    resetMessageFilter();
  });

  it('registers MessageFilter and respects shouldProcessMessage based on channel whitelist', async () => {
    const bot = new CovaBotContainer();
    await bot.initialize();

    // MessageFilter registered
    const mf: MessageFilter = container.get(ServiceId.MessageFilter);
    expect(mf).toBeDefined();

    // Create contexts with discord-like shape
    const blockedContext = { channelId: '987654321098765432', userId: '111111111111111111', username: 'user', isWebhook: false, authorIsBot: false } as any;
    const allowedContext = { channelId: '123456789012345678', userId: '111111111111111111', username: 'user', isWebhook: false, authorIsBot: false } as any;

    // When DEBUG_MODE=true, only whitelisted channels are allowed
    expect(mf.shouldProcessMessage(blockedContext).allowed).toBe(false);
    expect(mf.shouldProcessMessage(allowedContext).allowed).toBe(true);

    await bot.stop();
  });
});

