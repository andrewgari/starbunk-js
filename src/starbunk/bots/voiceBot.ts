import { VoiceState } from 'discord.js';

export default abstract class VoiceBot {
	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}
	abstract handleEvent(oldState: VoiceState, newState: VoiceState): void;
}
