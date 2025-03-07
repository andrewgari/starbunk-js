import { VoiceState } from 'discord.js';
import { ILogger } from '../../services/logger';
import loggerFactory from '../../services/loggerFactory';

export default abstract class VoiceBot {
	protected logger: ILogger;
	private volume: number;

	constructor(logger?: ILogger, volume = 1.0) {
		this.logger = logger || loggerFactory.getLogger();
		this.volume = volume;
	}

	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}

	getVolume(): number {
		return this.volume;
	}

	setVolume(newVolume: number): void {
		this.volume = Math.max(0, Math.min(newVolume, 2.0));
		this.logger.debug(`Volume set to ${this.volume}`);
	}

	abstract handleEvent(oldState: VoiceState, newState: VoiceState): void;
}
