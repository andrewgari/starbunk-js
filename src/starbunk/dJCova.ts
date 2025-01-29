import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  PlayerSubscription,
  VoiceConnection
} from '@discordjs/voice';
import https from 'https';
import prism from 'prism-media';

export class DJCova {
  private musicPlayer: AudioPlayer = createAudioPlayer();
  private activeResource: AudioResource | undefined;

  async start(url: string) {
    https
      .get(url, (res) => {
        const ffmpegStream = new prism.FFmpeg({
          args: [
            '-re', // Read input at native frame rate
            '-analyzeduration',
            '0',
            '-loglevel',
            '0',
            '-i',
            'pipe:0', // Input from stdin
            '-f',
            's16le', // Output raw PCM
            '-ar',
            '48000', // Set audio sample rate to 48kHz
            '-ac',
            '2', // Use 2 audio channels (stereo)
            'pipe:1' // Output to stdout
          ]
        });
        res.pipe(ffmpegStream);

        ffmpegStream.on('error', (err) => {
          console.error('FFmpeg error:', err);
          this.stop(); // Stop the player on FFmpeg error
        });

        res.on('error', (err) => {
          console.error('HTTP stream error:', err);
          this.stop();
        });

        this.activeResource = createAudioResource(ffmpegStream, {
          inlineVolume: true
        });
        this.activeResource?.volume?.setVolume(0.5);
        console.log('Volume:', this.activeResource?.volume?.volume);
        this.musicPlayer.play(this.activeResource);
      })
      .on('error', (err) => {
        console.error('HTTPS request error:', err);
      });
  }

  play() {
    if (this.activeResource) {
      this.musicPlayer.play(this.activeResource);
    } else {
      console.log('active resource is null');
    }
  }

  stop() {
    if (this.musicPlayer.state.status !== AudioPlayerStatus.Idle) {
      this.musicPlayer.stop();
      console.log('Playback Stopped');
    }
  }

  pause() {
    if (this.musicPlayer.state.status === AudioPlayerStatus.Playing) {
      this.musicPlayer.pause();
      console.log('Playback Stopped');
    }
  }

  changeVolume(vol: number) {
    this.activeResource?.volume?.setVolume(vol);
  }

  subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
    return channel.subscribe(this.musicPlayer);
  }

  on(status: AudioPlayerStatus, callback: () => void) {
    this.musicPlayer.on(status, callback);
  }
}
