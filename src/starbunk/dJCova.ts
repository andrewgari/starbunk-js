import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import { spawn } from "child_process";

export class DJCova {
    private musicPlayer: AudioPlayer = createAudioPlayer();
    private activeResource: AudioResource | undefined;

    start(url: string) {
        const getYtDlpStream = (url: string) => {
            return spawn('yt-dlp', ['-o', '-', 'bestaudio', url], { stdio: ['ignore', 'pipe', 'ignore'] });
        }
        const musicStream = getYtDlpStream(url);
        this.activeResource = createAudioResource(musicStream.stdout, { inlineVolume: true });
        this.musicPlayer.on('stateChange', (oldState: { status: any; }, newState: { status: any; }) => {
                console.log(`Player stat changed from ${oldState.status} to ${newState.status}`);
                if (this.activeResource?.started && newState.status == AudioPlayerStatus.Playing) {
                    return; // for now just don't do anything if something is actively playing
                }
        });
        this.musicPlayer.on('error', (error: Error) => {
            console.error('AudioPlayer error', error.message);
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
        this.musicPlayer.stop();
    }

    pause() {
        this.musicPlayer.pause();
    }

    changeVolume(vol: number) {
        this.activeResource?.volume?.setVolume(vol);
    }

    subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
        return channel.subscribe(this.musicPlayer);
    }
}