import { VoiceState } from 'discord.js';

import { Result } from '@/utils/result';

import { BaseBot } from './baseBot';

export interface VoiceBot extends BaseBot {
  handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
