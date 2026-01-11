import { VoiceState } from 'discord.js';
import { logger } from '@starbunk/shared';
import { BotIdentity } from '../types/bot-identity';

export interface VoiceTriggerResponse {
	name: string;
	condition: (oldState: VoiceState, newState: VoiceState) => Promise<boolean>;
	response: (oldState: VoiceState, newState: VoiceState) => Promise<void>;
	priority?: number;
}

export interface VoiceBotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: VoiceTriggerResponse[];
	volume?: number;
}

export interface VoiceBot {
	readonly name: string;
	readonly description: string;
	onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
	getVolume(): number;
	setVolume(volume: number): void;
}

export function createVoiceBot(config: VoiceBotConfig): VoiceBot {
	let volume = config.volume ?? 1.0;

	return {
		name: config.name,
		description: config.description,

		getVolume(): number {
			return volume;
		},

		setVolume(newVolume: number): void {
			volume = Math.max(0, Math.min(newVolume, 2.0));
			logger.debug(`[${config.name}] Volume set to ${volume}`);
		},

		async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
			logger.debug(`[${config.name}] Processing voice state update`);

			// Sort triggers by priority
			const sortedTriggers = [...config.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));

			// Process triggers in order
			for (const trigger of sortedTriggers) {
				try {
					if (await trigger.condition(oldState, newState)) {
						logger.debug(`[${config.name}] Trigger "${trigger.name}" matched`);
						await trigger.response(oldState, newState);
						return;
					}
				} catch (error) {
					logger.error(
						`[${config.name}] Error in voice trigger ${trigger.name}:`,
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			}
		},
	};
}
