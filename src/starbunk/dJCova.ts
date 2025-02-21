import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { Readable } from 'stream';

interface AudioTrack {
  resource: AudioResource;
  title: string;
  url: string;
}

export class DJCova {
  private readonly player: AudioPlayer;
  private connection?: VoiceConnection;
  private currentTrack?: AudioTrack;
  private queue: AudioTrack[] = [];

  constructor() {
    this.player = createAudioPlayer();
    this.setupPlayerEvents();
  }

  private setupPlayerEvents(): void {
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.currentTrack = undefined;
      this.playNext();
    });

    this.player.on('error', error => {
      console.error('Error:', error.message);
      this.playNext();
    });
  }

  async joinChannel(channel: VoiceBasedChannel): Promise<void> {
    try {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      
      this.connection.subscribe(this.player);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      throw error;
    }
  }

  async addTrack(stream: Readable, title: string, url: string): Promise<void> {
    const track: AudioTrack = {
      resource: createAudioResource(stream),
      title,
      url
    };

    if (!this.currentTrack) {
      await this.playTrack(track);
    } else {
      this.queue.push(track);
    }
  }

  private async playTrack(track: AudioTrack): Promise<void> {
    try {
      this.currentTrack = track;
      this.player.play(track.resource);
    } catch (error) {
      console.error('Failed to play track:', error);
      this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    const nextTrack = this.queue.shift();
    if (nextTrack) {
      await this.playTrack(nextTrack);
    }
  }

  getCurrentTrack(): AudioTrack | undefined {
    return this.currentTrack;
  }

  getQueue(): AudioTrack[] {
    return [...this.queue];
  }

  stop(): void {
    this.player.stop();
    this.queue = [];
    this.currentTrack = undefined;
  }

  disconnect(): void {
    this.stop();
    this.connection?.destroy();
    this.connection = undefined;
  }
}
