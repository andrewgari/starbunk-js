import { Message, TextChannel, VoiceState } from 'discord.js';

import { Result } from '@/utils/result';

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
  getAvatarUrl(): string;
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
  handleVoiceEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
