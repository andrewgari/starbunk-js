import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  PlayerSubscription,
  StreamType,
  VoiceConnection
} from '@discordjs/voice';
import play from 'play-dl';
import prism from 'prism-media';
import * as fs from 'node:fs';

export class DJCova {
  private musicPlayer: AudioPlayer = createAudioPlayer();
  private activeResource: AudioResource | undefined;

  getMusicPlayer(): AudioPlayer {
    return this.musicPlayer;
  }

  async start(url: string) {
    try {
      const cookies = this.parseCookies();

      console.log('[DEBUG] Initializing play-dl...');
      await play.setToken({
        youtube: {
          cookie: cookies,
        }
      });
      console.log('[DEBUG] Fetching stream...');
      const stream = await play.stream(url, {
        discordPlayerCompatibility: true,
      });
      console.log('[DEBUG] Stream obtained:', stream);

      // Use WebmDemuxer for Opus extraction
      const demuxer = new prism.opus.WebmDemuxer();
      stream.stream.pipe(demuxer);

      this.activeResource = createAudioResource(demuxer, {
        inputType: StreamType.WebmOpus,
        inlineVolume: true
      });
      this.activeResource.volume?.setVolume(0.5);

      console.log('[DEBUG] Playing resource...');
      this.musicPlayer.play(this.activeResource);
      console.log('[DEBUG] Audio resource created and playing started.');

      // Error handling
      demuxer
        .on('data', () => console.log('[DEBUG] Demuxer received data'))
        .on('end', () => console.log('[DEBUG] Demuxer ended'))
        .on('error', (err) => console.error('[DEBUG] Demuxer error:', err));
      stream.stream.on('error', (err) => console.error('Stream error:', err));
    } catch (error) {
      console.error('Error starting audio stream:', error);
    }
  }

  play() {
    if (this.activeResource) {
      this.musicPlayer.play(this.activeResource);
      console.log('Playing active resource.');
    } else {
      console.log('Active resource is null.');
    }
  }

  stop() {
    if (this.musicPlayer.state.status !== AudioPlayerStatus.Idle) {
      this.musicPlayer.stop();
      console.log('Playback stopped.');
    }
  }

  pause() {
    if (this.musicPlayer.state.status === AudioPlayerStatus.Playing) {
      this.musicPlayer.pause();
      console.log('Playback paused.');
    }
  }

  changeVolume(vol: number) {
    this.activeResource?.volume?.setVolume(vol);
    console.log('Volume changed to:', vol);
  }

  subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
    const subscription = channel.subscribe(this.musicPlayer);
    if (subscription) {
      console.log('Player successfully subscribed to connection.');
    } else {
      console.error('Failed to subscribe player to the connection.');
    }
    return subscription;
  }

  on(status: AudioPlayerStatus, callback: () => void) {
    this.musicPlayer.on(status, callback);
  }

  private parseCookies() {
    const cookies = fs.readFileSync('./cookies.txt', 'utf-8');
    return cookies
      .split('\n') // Split lines
      .filter(line => !line.startsWith('#') && line.trim() !== '') // Remove comments/blanks
      .map(line => {
        const parts = line.split('\t'); // Split by tabs
        return `${parts[5]}=${parts[6]}`; // Extract name=value (6th and 7th fields)
      })
      .join('; '); // Join with semicolons
  }
}
