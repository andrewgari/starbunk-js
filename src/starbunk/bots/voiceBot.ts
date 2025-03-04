import { VoiceState } from 'discord.js';
import { ILogger } from '../../services/Logger';
import loggerFactory from '../../services/LoggerFactory';

export default abstract class VoiceBot {
	protected logger: ILogger;

	constructor(logger?: ILogger) {
		this.logger = logger || loggerFactory.getLogger();
	}

	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}
	abstract handleEvent(oldState: VoiceState, newState: VoiceState): void;
}
