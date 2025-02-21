import { Message, TextChannel } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { WebhookService } from './webhookService';

export interface MessageSyncConfig {
  channelMap: Record<string, string[]>;
  excludedUserIds: string[];
}

export class MessageSyncService {
  private readonly config: MessageSyncConfig;
  private readonly webhookService: WebhookService;

  constructor(config: MessageSyncConfig, webhookService: WebhookService) {
    this.config = config;
    this.webhookService = webhookService;
  }

  async syncMessage(message: Message): Promise<Result<void, Error>> {
    try {
      if (this.shouldSkipMessage(message)) {
        return new Success(void 0);
      }

      const linkedChannels = this.getLinkedChannels(message.channel.id);
      const results = await Promise.all(
        linkedChannels.map((channelId) =>
          this.copyMessageToChannel(message, channelId)
        )
      );

      const errors = results
        .filter((r): r is Failure<Error> => r.isFailure())
        .map((r) => r.error);

      if (errors.length > 0) {
        return new Failure(
          new AggregateError(errors, 'Failed to sync message to some channels')
        );
      }

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to sync message')
      );
    }
  }

  private shouldSkipMessage(message: Message): boolean {
    return (
      message.author.bot ||
      this.config.excludedUserIds.includes(message.author.id)
    );
  }

  private getLinkedChannels(channelId: string): string[] {
    return this.config.channelMap[channelId] ?? [];
  }

  private async copyMessageToChannel(
    message: Message,
    channelId: string
  ): Promise<Result<void, Error>> {
    try {
      const channel = await message.client.channels.fetch(channelId);
      if (!(channel instanceof TextChannel)) {
        return new Failure(
          new Error('Target channel not found or not text channel')
        );
      }

      const displayName = this.getDisplayName(message, channel);
      const avatarUrl = this.getAvatarUrl(message);

      return this.webhookService.sendMessage(channel, {
        username: displayName,
        avatarURL: avatarUrl,
        content: message.content
      });
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to copy message')
      );
    }
  }

  private getDisplayName(message: Message, targetChannel: TextChannel): string {
    return (
      targetChannel.members.get(message.author.id)?.displayName ??
      message.member?.displayName ??
      message.author.displayName
    );
  }

  private getAvatarUrl(message: Message): string {
    return (
      message.member?.avatarURL() ??
      message.author.avatarURL() ??
      message.author.defaultAvatarURL
    );
  }
}
