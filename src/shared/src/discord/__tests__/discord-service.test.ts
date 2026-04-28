import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Message } from 'discord.js';
import { BotIdentity } from '../../types/bot-identity';

// Stub out WebhookService so we can control send() behaviour
const mockWebhookSend = vi.fn();

vi.mock('../webhook-service', () => ({
  WebhookService: class {
    send(...args: unknown[]) {
      return mockWebhookSend(...args);
    }
  },
}));

// Import after mocking so the mock is in place
const { DiscordService } = await import('../discord-service');

function makeMessage(): Message {
  return {
    channelId: 'ch-1',
    guildId: 'g-1',
    embeds: [],
    reply: vi.fn(),
  } as unknown as Message;
}

describe('DiscordService.sendMessageWithBotIdentity', () => {
  let service: InstanceType<typeof DiscordService>;
  const identity: BotIdentity = { botName: 'Cova', avatarUrl: 'https://example.com/cova.png' };

  beforeEach(() => {
    // Reset singleton state between tests
    (DiscordService as unknown as { instance: null }).instance = null;
    service = DiscordService.getInstance();
    // Inject a fake webhook service directly (bypasses real Discord init)
    (service as unknown as { webhookService: { send: typeof mockWebhookSend } }).webhookService = {
      send: mockWebhookSend,
    };
    mockWebhookSend.mockReset();
  });

  it('delegates to the webhook service', async () => {
    mockWebhookSend.mockResolvedValue(undefined);
    const message = makeMessage();
    await service.sendMessageWithBotIdentity(message, identity, 'hello');
    expect(mockWebhookSend).toHaveBeenCalledOnce();
    expect(mockWebhookSend).toHaveBeenCalledWith(message, identity, 'hello');
  });

  it('never calls message.reply regardless of what the webhook service throws', async () => {
    mockWebhookSend.mockRejectedValue(new Error('anything'));
    const message = makeMessage();
    // Error propagates — sendMessageWithBotIdentity has no catch block
    await expect(service.sendMessageWithBotIdentity(message, identity, 'hello')).rejects.toThrow();
    expect(message.reply).not.toHaveBeenCalled();
  });

  it('propagates unexpected errors from the webhook service', async () => {
    mockWebhookSend.mockRejectedValue(new Error('Network error'));
    const message = makeMessage();
    await expect(service.sendMessageWithBotIdentity(message, identity, 'hello')).rejects.toThrow(
      'Network error',
    );
  });
});
