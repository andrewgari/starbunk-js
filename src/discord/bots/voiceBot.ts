import { Client, VoiceState } from 'discord.js';
import { VoiceBot } from './types';
import { BaseBot } from './baseBot';
import { Result } from '../../utils/result';
import { WebhookService } from '../services/webhookService';

export abstract class BaseVoiceBot extends BaseBot implements VoiceBot {
  constructor(name: string, client: Client, webhookService: WebhookService) {
    super({ name, avatarUrl: '' }, client, webhookService);
  }

  abstract handleEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;
}
