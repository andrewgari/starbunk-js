import { VoiceChannel, VoiceState } from 'discord.js';
import channelIDs from '../../../discord/channelIDs';
import userID from '../../../discord/userID';
import { ILogger } from '../../../services/Logger';
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
		oldState.client.channels.fetch(channelIDs.Lounge1).then((channel) => {
			lounge = channel as VoiceChannel;

			if (member?.id === userID.Guy) {
				if (newChannelId === channelIDs.NoGuyLounge) {
					this.logger.warn(`🚫 Guy tried to join No-Guy-Lounge, redirecting to ${lounge.name}`);
					member.voice.setChannel(lounge);
				}
			} else if (newChannelId === channelIDs.GuyLounge) {
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
