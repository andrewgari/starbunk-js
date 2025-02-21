/// <reference types="jest" />
import { TextChannel, WebhookClient } from 'discord.js';
import webhookService from '../../webhooks/webhookService';

describe('WebhookService', () => {
  let mockChannel: jest.Mocked<TextChannel>;
  let mockWebhook: jest.Mocked<WebhookClient>;

  beforeEach(() => {
    mockWebhook = {
      send: jest.fn(),
      destroy: jest.fn()
    } as unknown as jest.Mocked<WebhookClient>;

    mockChannel = {
      id: '123',
      name: 'test-channel',
      guild: {
        id: '456'
      },
      fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
      createWebhook: jest.fn().mockResolvedValue({
        id: '789',
        token: 'test-token'
      })
    } as unknown as jest.Mocked<TextChannel>;
  });

  it('should create webhook if none exists', async () => {
    await webhookService.writeMessage(mockChannel, {
      content: 'test message'
    });

    expect(mockChannel.createWebhook).toHaveBeenCalled();
  });

  it('should reuse existing webhook', async () => {
    const existingWebhook = {
      id: '789',
      token: 'test-token',
      name: 'BunkBot Webhook'
    };

    mockChannel.fetchWebhooks.mockResolvedValueOnce(
      new Map([[existingWebhook.id, existingWebhook]])
    );

    await webhookService.writeMessage(mockChannel, {
      content: 'test message'
    });

    expect(mockChannel.createWebhook).not.toHaveBeenCalled();
  });
}); 