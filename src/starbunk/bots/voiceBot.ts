import { Client, VoiceState, Message } from 'discord.js';

import { VoiceBot } from '../../discord/bots/types';
import { Result, Success } from '../../utils/result';

export default abstract class VoiceBotBase implements VoiceBot {
  constructor(
    protected readonly name: string,
    protected readonly client: Client
  ) {}

  getName(): string {
    return this.name;
  }

  canHandle(message: Message): boolean {
    return false; // Voice bots don't handle messages
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return new Success(void 0); // Voice bots don't handle messages
  }

  abstract handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
