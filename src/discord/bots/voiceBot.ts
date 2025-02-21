import { Client, Message, VoiceState } from 'discord.js';

import { Failure, Result } from '@/utils/result';

import { AudioService } from '../services/audioService';
import { VoiceCapableBot } from './types';

export abstract class BasicVoiceBot implements VoiceCapableBot {
  constructor(
    private readonly name: string,
    private readonly avatarUrl: string,
    protected readonly client: Client,
    protected readonly audioService: AudioService
  ) {
    this.name = name;
    this.avatarUrl = avatarUrl;
    this.client = client;
    this.audioService = audioService;
  }

  getName(): string {
    return this.name;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<Result<void, Error>>;
  abstract handleVoiceEvent(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<Result<void, Error>>;

  protected async joinVoiceChannel(
    state: VoiceState
  ): Promise<Result<void, Error>> {
    if (!state.member) {
      return new Failure(new Error('No member associated with voice state'));
    }

    return this.audioService.join(state.member);
  }

  protected async playAudio(url: string): Promise<Result<void, Error>> {
    return this.audioService.play(url);
  }

  protected async stopAudio(): Promise<Result<void, Error>> {
    return this.audioService.stop();
  }
}
