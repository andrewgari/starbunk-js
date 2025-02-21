import { Client, Message, VoiceState } from 'discord.js';
import { Result, Success, Failure } from '@/utils/result';
import { VoiceCapableBot } from './types';
import { AudioService } from '../services/audioService';

export abstract class BasicVoiceBot implements VoiceCapableBot {
  constructor(
    private readonly name: string,
    private readonly avatarUrl: string,
    protected readonly client: Client,
    protected readonly audioService: AudioService
  ) {}

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
