import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';
import { VennDiagram } from '../vennDiagram';

export default class VennBot extends ReplyBot {
	private _botName: string = getBotName('Venn');
	private _avatarUrl: string = getBotAvatar('Venn');
	private diagram: VennDiagram;

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'Venn Bot';
	}

	constructor(diagram: VennDiagram = { leftCircle: 'Cringe', rightCircle: 'Based' }) {
		super();
		this.diagram = diagram;
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (
			(message.author.id == userID.Venn && random.percentChance(5)) ||
			getBotPattern('Venn', 'Default')?.test(message.content)
		) {
			const response = `${this.diagram.leftCircle} vs ${this.diagram.rightCircle}: ${getBotResponse('Venn', 'Default')}`;
			this.sendReply(message.channel as TextChannel, response);
		}
	}
}
