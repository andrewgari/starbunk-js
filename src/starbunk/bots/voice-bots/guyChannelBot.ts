import { VoiceChannel, VoiceState } from 'discord.js';
import channelIDs from '../../../discord/channelIDs';
import userID from '../../../discord/userID';
import { Logger } from '../../../services/logger';
import VoiceBot from '../voiceBot';

// Define interfaces for the bot's components
export interface VoiceStateHandler {
	handleVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void>;
}

export interface ChannelRedirectRule {
	shouldRedirect(member: VoiceState['member'], channelId: string | null): boolean;
	getRedirectChannelId(): string;
}

// Guy-specific rule: Guy can't join NoGuyLounge
export class GuyNoGuyLoungeRule implements ChannelRedirectRule {
	shouldRedirect(member: VoiceState['member'], channelId: string | null): boolean {
		return member?.id === userID.Guy && channelId === channelIDs.NoGuyLounge;
	}

	getRedirectChannelId(): string {
		return channelIDs.Lounge1;
	}
}

// Non-Guy rule: Non-Guy users can't join GuyLounge
export class NonGuyGuyLoungeRule implements ChannelRedirectRule {
	shouldRedirect(member: VoiceState['member'], channelId: string | null): boolean {
		return member?.id !== userID.Guy && channelId === channelIDs.GuyLounge;
	}

	getRedirectChannelId(): string {
		return channelIDs.Lounge1;
	}
}

// Main handler that applies all rules
export class VoiceChannelRuleHandler implements VoiceStateHandler {
	private rules: ChannelRedirectRule[];
	private logger: typeof Logger;

	constructor(rules: ChannelRedirectRule[], logger: typeof Logger = Logger) {
		this.rules = rules;
		this.logger = logger;
	}

	async handleVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const member = newState.member;
		const newChannelId = newState.channelId;
		const oldChannelId = oldState.channelId;

		if (!member) {
			this.logger.warn('Received voice state update without member information');
			return;
		}

		// Log channel movements
		if (oldChannelId !== newChannelId) {
			this.logger.debug(
				`👤 ${member.displayName} moved from ${oldChannelId || 'nowhere'} to ${newChannelId || 'nowhere'}`
			);
		}

		// Check if any rules apply
		for (const rule of this.rules) {
			if (rule.shouldRedirect(member, newChannelId)) {
				const redirectChannelId = rule.getRedirectChannelId();
				try {
					const redirectChannel = await newState.client.channels.fetch(redirectChannelId) as VoiceChannel;

					if (member.id === userID.Guy) {
						this.logger.warn(`🚫 Guy tried to join No-Guy-Lounge, redirecting to ${redirectChannel.name}`);
					} else {
						this.logger.warn(
							`🚫 User ${member.displayName} tried to join Guy's lounge, redirecting to ${redirectChannel.name}`
						);
					}

					await member.voice.setChannel(redirectChannel);
				} catch (error) {
					this.logger.warn(`Failed to redirect user ${member.displayName}: ${error}`);
				}
				break; // Stop after first matching rule
			}
		}
	}
}

interface GuyChannelBotConfig {
	logger?: typeof Logger;
	rules?: ChannelRedirectRule[];
	handler?: VoiceStateHandler;
}

export default class GuyChannelBot extends VoiceBot {
	private readonly logger: typeof Logger;
	private readonly handler: VoiceStateHandler;

	constructor(config: GuyChannelBotConfig = {}) {
		super();
		this.logger = config.logger ?? Logger;

		// Create default rules if not provided
		const rules = config.rules ?? [
			new GuyNoGuyLoungeRule(),
			new NonGuyGuyLoungeRule()
		];

		// Create default handler if not provided
		this.handler = config.handler ?? new VoiceChannelRuleHandler(rules, this.logger);
	}

	getBotName(): string {
		return 'Guy Channel Bot';
	}

	async handleEvent(oldState: VoiceState, newState: VoiceState): Promise<void> {
		await this.handler.handleVoiceState(oldState, newState);
	}
}
