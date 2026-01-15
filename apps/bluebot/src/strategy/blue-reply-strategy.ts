import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';
import { DefaultStrategy } from '@/strategy/default-strategy';
import { ConfirmStrategy } from '@/strategy/confirm-strategy';

const defaultStrategy = new DefaultStrategy();
const confirmStrategy = new ConfirmStrategy();
export class BlueReplyStrategy implements Strategy {
	private lastBlueResponse = new Date();
	private readonly replyWindow = 300000; // 5 minutes in ms

	shouldRespond(message: Message): Promise<boolean> {
		const timestamp = new Date(message.createdTimestamp);
		const timeSinceLastResponse = timestamp.getTime() - this.lastBlueResponse.getTime();

		if (timeSinceLastResponse >= this.replyWindow) {
			return defaultStrategy.shouldRespond(message);
		}

		return confirmStrategy.shouldRespond(message);
	}

	getResponse(_message: Message): Promise<string> {
		this.lastBlueResponse = new Date();
		return Promise.resolve('Yes');
	}
}
