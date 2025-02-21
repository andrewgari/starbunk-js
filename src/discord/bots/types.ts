import { Message, TextChannel, VoiceState } from 'discord.js';

import { Result } from '@/utils/result';

export interface Bot {
  getName(): string;
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
}

export interface MessageBot {
  getName(): string;
  getAvatarUrl(): string;
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
  sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>>;
}

export interface VoiceBot {
  getName(): string;
  handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
