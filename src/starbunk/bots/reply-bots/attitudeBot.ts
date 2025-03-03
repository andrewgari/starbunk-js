import { Message, TextChannel } from "discord.js";
import ReplyBot from "../replyBot";
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from "./botConstants";

export default class AttitudeBot extends ReplyBot {
	public readonly botName: string = getBotName('Attitude');
	public readonly avatarUrl: string = getBotAvatar('Attitude');

	defaultBotName(): string {
		return 'Attitude Bot';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Attitude', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Attitude', 'Default'));
		}
	}
}
