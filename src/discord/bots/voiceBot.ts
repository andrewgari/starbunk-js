import { Client, GuildMember, Message, VoiceState } from 'discord.js';

import { Result } from '@/utils/result';

import { AudioService } from '../services/audioService';
import { VoiceBot } from './types';

export abstract class BaseVoiceBot implements VoiceBot {
  protected constructor(
    protected readonly name: string,
    protected readonly avatarUrl: string,
    protected readonly client: Client,
    protected readonly audioService: AudioService
  ) {
    if (!name) throw new Error('Bot name is required');
    if (!avatarUrl) throw new Error('Bot avatar URL is required');
    if (!client) throw new Error('Discord client is required');
    if (!audioService) throw new Error('Audio service is required');
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

  protected async joinVoice(member: GuildMember): Promise<Result<void, Error>> {
    return this.audioService.join(member);
  }

  protected async playAudio(url: string): Promise<Result<void, Error>> {
    return this.audioService.play(url);
  }

  protected async stopAudio(): Promise<Result<void, Error>> {
    return this.audioService.stop();
  }
}
