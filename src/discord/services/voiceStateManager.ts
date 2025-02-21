import { VoiceState } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { VoiceBot } from '../bots/types';
import { BotRegistry } from './botRegistry';
import { Bot } from '../bots/types';

export class VoiceStateManager {
  constructor(private readonly botRegistry: BotRegistry<Bot>) {}

  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>> {
    try {
      const voiceBots = this.botRegistry
        .getAllBots()
        .filter((bot): bot is VoiceBot => 'handleEvent' in bot);

      const results = await Promise.all(
        voiceBots.map((bot) => bot.handleEvent(oldState, newState))
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
    } catch (error) {
      return new Failure(
        error instanceof Error
          ? error
          : new Error('Failed to handle voice state')
      );
    }
  }
}
