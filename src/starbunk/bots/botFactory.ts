import { Message } from 'discord.js';
import { Logger } from '../../services/logger';
import { BotIdentity, ResponseGenerator } from './botTypes';


export interface DynamicIdentityConfig {
	defaultName: string;
	defaultAvatarUrl: string;
	updateIdentity(message: Message): Promise<BotIdentity>;
}

export class DynamicIdentity implements BotIdentity {
	name: string;
	avatarUrl: string;

	constructor(private config: {
		defaultName: string;
		defaultAvatarUrl: string;
		updateIdentity: (message: Message) => Promise<BotIdentity>;
	}) {
		this.name = config.defaultName;
		this.avatarUrl = config.defaultAvatarUrl;
	}

	async updateFrom(message: Message): Promise<void> {
		try {
			const newIdentity = await this.config.updateIdentity(message);
			this.name = newIdentity.name || this.config.defaultName;
			this.avatarUrl = newIdentity.avatarUrl || this.config.defaultAvatarUrl;
		} catch (err) {
			Logger.error('Error updating dynamic identity:', err as Error);
			// Reset to defaults on error
			this.name = this.config.defaultName;
			this.avatarUrl = this.config.defaultAvatarUrl;
		}
	}
}

export class DynamicResponse implements ResponseGenerator {
	constructor(
		private identity: DynamicIdentity,
		private baseResponseGenerator: ResponseGenerator
	) { }

	async generateResponse(message: Message): Promise<string | null> {
		await this.identity.updateFrom(message);
		return this.baseResponseGenerator.generateResponse(message);
	}
}
