import { Message, TextChannel, VoiceState } from 'discord.js';

import { Result } from '@/utils/result';

// Base interface for all bots
export interface Bot {
  getName(): string;
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
}

// For bots that respond to messages
export interface MessageBot extends Bot {
  getAvatarUrl(): string;
  sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>>;
}

// For bots that respond to voice events
export interface VoiceBot extends Bot {
  handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
