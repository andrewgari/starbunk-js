import { Client, VoiceState } from 'discord.js';

import { VoiceBot } from '../../discord/bots/types';
import { Result } from '../../utils/result';

export default abstract class VoiceBotBase implements VoiceBot {
  constructor(
    protected readonly name: string,
    protected readonly client: Client
  ) {
    this.client = client;
  }

  getName(): string {
    return this.name;
  }

  abstract handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
