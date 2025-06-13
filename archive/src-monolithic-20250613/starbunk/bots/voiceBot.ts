import { VoiceState } from 'discord.js';
import { logger } from '../../services/logger';

export abstract class VoiceBot {
	abstract botName: string;
	private volume: number;

	protected constructor(volume = 1.0) {
		this.volume = Math.max(0, Math.min(volume, 2.0));
	}

	defaultBotName(): string {
		return this.botName;
	}

	getVolume(): number {
		return this.volume;
	}

	setVolume(newVolume: number): void {
		this.volume = Math.max(0, Math.min(newVolume, 2.0));
		logger.debug(`Volume set to ${this.volume}`);
	}

	abstract onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
}
