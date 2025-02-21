import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection
} from '@discordjs/voice';
import { GuildMember, VoiceChannel } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

export interface AudioConfig {
  maxVolume: number;
  defaultVolume: number;
}

export class AudioService {
  private readonly config: AudioConfig;
  private readonly player: AudioPlayer;
  private connection?: VoiceConnection;
  private currentResource?: AudioResource;

  constructor(config: AudioConfig) {
    this.config = config;
    this.player = createAudioPlayer();
  }

  async join(member: GuildMember): Promise<Result<void, Error>> {
    try {
      if (!(member.voice.channel instanceof VoiceChannel)) {
        return new Failure(new Error('Must be in a voice channel'));
      }

      this.connection = joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: member.guild.id,
        adapterCreator: member.guild.voiceAdapterCreator
      });

      this.connection.subscribe(this.player);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error
          ? error
          : new Error('Failed to join voice channel')
      );
    }
  }

  async play(url: string): Promise<Result<void, Error>> {
    try {
      if (!this.connection) {
        return new Failure(new Error('Not connected to voice channel'));
      }

      this.currentResource = createAudioResource(url);
      this.player.play(this.currentResource);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to play audio')
      );
    }
  }

  async setVolume(volume: number): Promise<Result<void, Error>> {
    try {
      if (!this.currentResource) {
        return new Failure(new Error('No audio playing'));
      }

      const normalizedVolume = Math.min(
        Math.max(0, volume),
        this.config.maxVolume
      );
      this.currentResource.volume?.setVolume(normalizedVolume / 100);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to set volume')
      );
    }
  }

  async stop(): Promise<Result<void, Error>> {
    try {
      this.player.stop();
      this.connection?.destroy();
      this.connection = undefined;
      this.currentResource = undefined;

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to stop playback')
      );
    }
  }

  isPlaying(): boolean {
    return this.player.state.status === AudioPlayerStatus.Playing;
  }
}
