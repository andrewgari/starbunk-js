import { Message, TextChannel } from 'discord.js';
import roleIDs from '../../../discord/roleIDs';
import ReplyBot from '../replyBot';

export default class MacaroniBot extends ReplyBot {
	private readonly botName = 'MacaroniBot';
	private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';
	private readonly vennPattern = /\bvenn\b/i;
	private readonly macaorniPattern = /\bmacaroni\b/i;
	private readonly macaroniNamePattern = /venn(?!.*Tyrone "The "Macaroni" Man" Johnson" Caelum).*/i;
	private readonly vennResponse = 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
	private readonly macaroniResponse = (id: string): string => `Are you trying to reach <@&${id}>`;

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.macaorniPattern) && !message.content.match(this.macaroniNamePattern)) {
			this.sendReply(message.channel as TextChannel, this.vennResponse);
		} else if (message.content.match(this.vennPattern)) {
			this.sendReply(message.channel as TextChannel, this.macaroniResponse(roleIDs.Macaroni));
		}
	}
}
