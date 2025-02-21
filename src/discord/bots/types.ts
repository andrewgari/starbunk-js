import { Message, TextChannel, VoiceState } from 'discord.js';
import { Result } from '@/utils/result';

export interface Bot {
  getName(): string;
  getAvatarUrl(): string;
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
}

export interface MessageBot extends Bot {
  sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>>;
}

export interface VoiceCapableBot extends Bot {
  handleVoiceEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
