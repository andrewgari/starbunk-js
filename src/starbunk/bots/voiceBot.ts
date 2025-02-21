import { VoiceState } from "discord.js";

export default abstract class VoiceBot {
    abstract getBotName(): string;
    abstract handleEvent(oldState: VoiceState, newState: VoiceState): Promise<void>;
}
