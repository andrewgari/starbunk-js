import { VoiceState } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { VoiceBot } from '../bots/types';
import { BotRegistry } from './botRegistry';

export class VoiceStateManager {
  private readonly voiceBots: BotRegistry<VoiceBot>;

  constructor(voiceBots: BotRegistry<VoiceBot>) {
    this.voiceBots = voiceBots;
  }

  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>> {
    try {
      const bots = this.voiceBots.getAllBots();
      const results = await Promise.all(
        bots.map((bot) => bot.handleVoiceEvent(oldState, newState))
      );

      const errors = results
        .filter((r): r is Failure<Error> => r.isFailure())
        .map((r) => r.error);

      if (errors.length > 0) {
        return new Failure(
          new AggregateError(errors, 'Voice state update failed')
        );
      }

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error
          ? error
          : new Error('Failed to handle voice state')
      );
    }
  }
}
