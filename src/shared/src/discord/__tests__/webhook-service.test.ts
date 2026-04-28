import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Client, Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../../types/bot-identity';
import { WebhookService } from '../webhook-service';

function makePermissionError(): Error {
  const err = new Error('Missing Permissions');
  (err as unknown as { code: number }).code = 50013;
  return err;
}

const mockWebhookSend = vi.fn();
const mockCreateWebhook = vi.fn();
const mockFetchWebhooks = vi.fn();

function makeChannel(): TextChannel {
  return {
    id: 'ch-1',
    name: 'general',
    type: 0,
    fetchWebhooks: mockFetchWebhooks,
    createWebhook: mockCreateWebhook,
    isTextBased: () => true,
  } as unknown as TextChannel;
}

function makeMessage(): Message {
  return {
    channelId: 'ch-1',
    embeds: [],
    reply: vi.fn(),
  } as unknown as Message;
}

const identity: BotIdentity = { botName: 'Cova', avatarUrl: 'https://example.com/cova.png' };

describe('WebhookService.send', () => {
  let client: Client;
  let service: WebhookService;

  beforeEach(() => {
    client = {
      channels: {
        fetch: vi.fn().mockResolvedValue(makeChannel()),
      },
    } as unknown as Client;

    service = new WebhookService(client);
    mockWebhookSend.mockReset();
    mockFetchWebhooks.mockReset();
    mockCreateWebhook.mockReset();
  });

  it('sends via existing webhook with correct identity', async () => {
    const webhook = { id: 'wh-1', token: 'tok', name: 'BunkBot', send: mockWebhookSend };
    mockFetchWebhooks.mockResolvedValue({
      find: (fn: (wh: { token: string | null; name: string }) => boolean) => fn(webhook) && webhook,
    });
    mockWebhookSend.mockResolvedValue(undefined);

    await service.send(makeMessage(), identity, 'hello');

    expect(mockWebhookSend).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'Cova',
        avatarURL: 'https://example.com/cova.png',
        content: 'hello',
      }),
    );
  });

  it('creates a webhook if none exists, then sends', async () => {
    const webhook = { id: 'wh-new', token: 'tok', name: 'BunkBot', send: mockWebhookSend };
    mockFetchWebhooks.mockResolvedValue({ find: () => undefined });
    mockCreateWebhook.mockResolvedValue(webhook);
    mockWebhookSend.mockResolvedValue(undefined);

    await service.send(makeMessage(), identity, 'hello');

    expect(mockCreateWebhook).toHaveBeenCalledWith(expect.objectContaining({ name: 'BunkBot' }));
    expect(mockWebhookSend).toHaveBeenCalled();
  });

  it('skips silently when Manage Webhooks permission is missing — never falls back', async () => {
    mockFetchWebhooks.mockRejectedValue(makePermissionError());
    const message = makeMessage();

    // Must resolve (not throw) — missing perms is not an error, just a skip
    await expect(service.send(message, identity, 'hello')).resolves.toBeUndefined();

    // No fallback send of any kind
    expect(mockWebhookSend).not.toHaveBeenCalled();
    expect(message.reply).not.toHaveBeenCalled();
  });

  it('propagates non-permission errors', async () => {
    mockFetchWebhooks.mockRejectedValue(new Error('Discord API down'));

    await expect(service.send(makeMessage(), identity, 'hello')).rejects.toThrow(
      'Discord API down',
    );
  });

  it('passes undefined avatarURL when avatarUrl is empty string', async () => {
    const webhook = { id: 'wh-1', token: 'tok', name: 'BunkBot', send: mockWebhookSend };
    mockFetchWebhooks.mockResolvedValue({
      find: (fn: (wh: { token: string | null; name: string }) => boolean) => fn(webhook) && webhook,
    });
    mockWebhookSend.mockResolvedValue(undefined);

    const noAvatarIdentity: BotIdentity = { botName: 'Cova', avatarUrl: '' };
    await service.send(makeMessage(), noAvatarIdentity, 'hello');

    expect(mockWebhookSend).toHaveBeenCalledWith(expect.objectContaining({ avatarURL: undefined }));
  });
});
