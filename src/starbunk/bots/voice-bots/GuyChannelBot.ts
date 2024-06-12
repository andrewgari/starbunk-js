import { VoiceChannel, VoiceState } from "discord.js";
import VoiceBot from "../voiceBot"
import userID from "../../../discord/userID";
import channelIDs from "../../../discord/channelIDs";

export default class GuyChannelBot extends VoiceBot {
    getBotName(): string {
        return 'Guy Channel Bot';
    }

    handleEvent(oldState: VoiceState, newState: VoiceState): void {
        const member = oldState.member;
        const newChannelId = newState.channelId;

        if (!member) return;

        let lounge: VoiceChannel;
        oldState.client.channels.fetch(channelIDs.Lounge1).then((channel) => {
            lounge = channel as VoiceChannel

            if (member?.id === userID.Guy) {
                if (newChannelId === channelIDs.NoGuyLounge) {
                    console.log('Guy doesnt belong here, setting voice channel to Lounge');
                    member.voice.setChannel(lounge);
                }
            } else {
                if (newChannelId === channelIDs.GuyLounge) {
                    console.log('Some idiot doesnt belong here, setting voice channel to Lounge');
                    member.voice.setChannel(lounge);
                }
            }
        });
    }
}