import { Message } from 'discord.js';
import { MessageProcessor } from '../MessageProcessor';
import { MessageFilter } from '@starbunk/shared';

// Minimal ReplyBotImpl-like mock
interface MockReplyBot {
  name: string;
  shouldRespond: jest.Mock<Promise<boolean>, [Message]>;
  processMessage: jest.Mock<Promise<void>, [Message]>;
}

function createMockBot(name = 'TestBot'): MockReplyBot {
  return {
    name,
    shouldRespond: jest.fn(async () => true),
    processMessage: jest.fn(async () => undefined),
  };
}

// Create a minimal MessageFilter stub that allows everything (so only the
// internal bot-exclusion logic can short-circuit processing)
const allowAllMessageFilter: MessageFilter = {
  shouldProcessMessage: () => ({ allowed: true }),
  isDebugMode: () => false,
} as unknown as MessageFilter;

function createCovaBotMessage(): Message {
  const msg: Partial<Message> = {
    id: 'm1',
    content: 'some content',
    author: {
      id: '999',
      username: 'CovaBot',
      displayName: 'CovaBot',
      bot: true,
    } as any,
    channel: {
      id: 'channel-1',
      name: 'test-channel',
      send: jest.fn(),
    } as any,
    guild: { id: 'guild-1', name: 'Test Guild' } as any,
    client: { user: { id: 'bunkbot-user-id' } } as any,
  };
  return msg as Message;
}

describe('MessageProcessor + centralized skip: CovaBot messages', () => {
  test('should short-circuit and not call any bots for CovaBot messages', async () => {
    const bot = createMockBot();
    const processor = new MessageProcessor(allowAllMessageFilter, [bot as any]);

    const message = createCovaBotMessage();

    await expect(processor.processMessage(message)).resolves.toBeUndefined();

    // The processor should early-exit on shouldExcludeFromReplyBots for bot messages
    expect(bot.shouldRespond).not.toHaveBeenCalled();
    expect(bot.processMessage).not.toHaveBeenCalled();
  });
});

