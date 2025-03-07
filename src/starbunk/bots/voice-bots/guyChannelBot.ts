import { VoiceChannel, VoiceState } from 'discord.js';
import channelIds from '../../../discord/channelIds';
import userId from '../../../discord/userId';
import { ILogger } from '../../../services/logger';
import VoiceBot from '../voiceBot';

export default class GuyChannelBot extends VoiceBot {
	public readonly botName = 'Guy Channel Bot';

	constructor(logger?: ILogger) {
		super(logger, 1.0);
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
		// In debug mode, always use CovaDaxServer.General1
		const loungeChannelId = process.env.DEBUG_MODE === 'true'
			? channelIds.CovaDaxServer.General1
			: channelIds.Starbunk.TheLounge;

		oldState.client.channels.fetch(loungeChannelId).then((channel) => {
			lounge = channel as VoiceChannel;

			const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Guy;
			if (member?.id === targetUserId) {
				if (newChannelId === channelIds.Starbunk.NoGuyLounge) {
					this.logger.warn(`🚫 ${member.displayName} tried to join No-Guy-Lounge, redirecting to ${lounge.name}`);
					member.voice.setChannel(lounge);
				}
			} else if (newChannelId === channelIds.Starbunk.GuyLounge) {
				this.logger.warn(`🚫 User ${member.displayName} tried to join Guy's lounge, redirecting to ${lounge.name}`);
				member.voice.setChannel(lounge);
			}

			if (oldChannelId !== newChannelId) {
				this.logger.debug(`👤 ${member.displayName} moved from ${oldChannelId || 'nowhere'} to ${newChannelId || 'nowhere'}`);
			}
		});
	}

	connectToChannel(): void {
		// Implementation will be added later
	}
}
