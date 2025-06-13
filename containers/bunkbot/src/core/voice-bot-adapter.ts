import { VoiceState } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { VoiceBot } from './voice-bot-builder';

/**
 * Base class for voice bots that provides common functionality
 */
export abstract class BaseVoiceBot {
	abstract readonly name: string;
	abstract readonly description: string;
	protected volume: number = 1.0;

	getVolume(): number {
		return this.volume;
	}

	setVolume(newVolume: number): void {
		this.volume = Math.max(0, Math.min(newVolume, 2.0));
		logger.debug(`[${this.name}] Volume set to ${this.volume}`);
	}

	abstract onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
}

/**
 * Adapter class that wraps a VoiceBot to make it compatible with BaseVoiceBot interface.
 * This allows strategy-based voice bots to work with the existing voice processing pipeline.
 */
export class VoiceBotAdapter extends BaseVoiceBot {
	private voiceBot: VoiceBot;

	constructor(voiceBot: VoiceBot) {
		super();
		this.voiceBot = voiceBot;
		logger.debug(`[VoiceBotAdapter] Created adapter for ${voiceBot.name}`);
	}

	get name(): string {
		return this.voiceBot.name;
	}

	get description(): string {
		return this.voiceBot.description;
	}

	get botIdentity(): BotIdentity {
		// We can't easily access the default identity from the voice bot
		// So we'll use a placeholder that will be overridden by the specific trigger's identity
		return {
			botName: this.voiceBot.name,
			avatarUrl: '' // Will be provided by the specific trigger
		};
	}

	getVolume(): number {
		return this.voiceBot.getVolume();
	}

	setVolume(newVolume: number): void {
		this.voiceBot.setVolume(newVolume);
	}

	async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		try {
			await this.voiceBot.onVoiceStateUpdate(oldState, newState);
		} catch (error) {
			logger.error(`[${this.name}] Error in voice bot state handling:`, error instanceof Error ? error : new Error(String(error)));
		}
	}
}
