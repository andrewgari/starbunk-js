import channelIDs from '@/discord/channelIDs';
import userID from '@/discord/userID';
import { Logger } from '@/services/Logger';
import VoiceBot from '@/starbunk/bots/voiceBot';
import { VoiceChannel, VoiceState } from 'discord.js';

interface GuyChannelBotConfig {
	logger?: typeof Logger;
}

export default class GuyChannelBot extends VoiceBot {
	private readonly logger: typeof Logger;

	constructor(config: GuyChannelBotConfig = {}) {
		super();
		this.logger = config.logger ?? Logger;
	}

	getBotName(): string {
		return 'Guy Channel Bot';
	}

	handleEvent(oldState: VoiceState, newState: VoiceState): void {
		const member = oldState.member;
		const newChannelId = newState.channelId;
		const oldChannelId = oldState.channelId;

		if (!member) {
			this.logger.warn('Received voice state update without member information');
			return;
		}

		let lounge: VoiceChannel;
		oldState.client.channels.fetch(channelIDs.Lounge1).then((channel) => {
			lounge = channel as VoiceChannel;

			if (member?.id === userID.Guy) {
				if (newChannelId === channelIDs.NoGuyLounge) {
					this.logger.warn(`🚫 Guy tried to join No-Guy-Lounge, redirecting to ${lounge.name}`);
					member.voice.setChannel(lounge);
				}
			} else if (newChannelId === channelIDs.GuyLounge) {
				this.logger.warn(
					`🚫 User ${member.displayName} tried to join Guy's lounge, redirecting to ${lounge.name}`,
				);
				member.voice.setChannel(lounge);
			}

			if (oldChannelId !== newChannelId) {
				this.logger.debug(
					`👤 ${member.displayName} moved from ${oldChannelId || 'nowhere'} to ${newChannelId || 'nowhere'}`,
				);
			}
		});
	}
}
