import { Message, TextChannel } from "discord.js";
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from "../botConstants";
import ReplyBot from "../replyBot";

export default class AttitudeBot extends ReplyBot {
	public readonly botName: string = getBotName('Attitude');
	public readonly avatarUrl: string = getBotAvatar('Attitude');
	private mood: string;

	constructor(mood: string = 'grumpy') {
		super();
		this.mood = mood;
	}

	defaultBotName(): string {
		return 'Attitude Bot';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Attitude', 'Default')?.test(message.content)) {
			const response = `${this.mood.toUpperCase()}: ${getBotResponse('Attitude', 'Default')}`;
			this.sendReply(message.channel as TextChannel, response);
		}
	}
}
