import userID from '@/discord/userID';
import ReplyBot from '@/starbunk/bots/replyBot';
import random from '@/utils/random';
import { WebhookService } from '@/webhooks/webhookService';
import { GuildMember, Message, TextChannel } from 'discord.js';

export default class GuyBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
		this.botName = 'GuyBot';
		this.avatarUrl = '';
		this.guyResponses = [
			'What!? What did you say?',
			'Geeeeeet ready for Shriek Week!',
			'Try and keep up mate....',
			'But Who really died that day.\n...and who came back?',
			'Sheeeeeeeeeeeesh',
			"Rats! Rats! Weeeeeeee're the Rats!",
			'The One Piece is REEEEEEEEEEEEEEEEEEAL',
			'Psh, I dunno about that, Chief...',
			'Come to me my noble EINHERJAHR',
			"If you can't beat em, EAT em!",
			'Have you ever been so sick you sluiced your pants?',
			"Welcome back to ... Melon be Smellin'",
			"Chaotic Evil: Don't Respond. :unamused:",
			':NODDERS: Big Boys... :NODDERS:',
			'Fun Fact: That was actually in XI as well.',
			'Bird Up!',
			'Schlorp',
			"I wouldn't dream of disturbing something so hideously erogenous",
			'Good Year, Good Year',
			'True Grit',
			'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
			"It's a message you can say",
			'Blimbo',
		];
		this.nonGuyPattern = /\bguy\b/i;
	}
	private botName = 'GuyBot';
	private avatarUrl = '';
	private readonly guyResponses = [
		'What!? What did you say?',
		'Geeeeeet ready for Shriek Week!',
		'Try and keep up mate....',
		'But Who really died that day.\n...and who came back?',
		'Sheeeeeeeeeeeesh',
		"Rats! Rats! Weeeeeeee're the Rats!",
		'The One Piece is REEEEEEEEEEEEEEEEEEAL',
		'Psh, I dunno about that, Chief...',
		'Come to me my noble EINHERJAHR',
		"If you can't beat em, EAT em!",
		'Have you ever been so sick you sluiced your pants?',
		"Welcome back to ... Melon be Smellin'",
		"Chaotic Evil: Don't Respond. :unamused:",
		':NODDERS: Big Boys... :NODDERS:',
		'Fun Fact: That was actually in XI as well.',
		'Bird Up!',
		'Schlorp',
		"I wouldn't dream of disturbing something so hideously erogenous",
		'Good Year, Good Year',
		'True Grit',
		'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
		"It's a message you can say",
		'Blimbo',
	];
	private readonly nonGuyPattern = /\bguy\b/i;

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	getResponse(): string {
		return this.guyResponses[random.roll(this.guyResponses.length)];
	}
	getGuyFromMessage(message: Message): Promise<GuildMember> {
		const guy = message.guild?.members.fetch(userID.Guy);
		if (guy) {
			return Promise.resolve(guy);
		}
		return Promise.reject(new Error('Guy was not found in the server.'));
	}
	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;
		if (
			message.content.match(this.nonGuyPattern) ||
			(message.author.id === userID.Guy && random.percentChance(5))
		) {
			this.getGuyFromMessage(message)
				.then((guy) => {
					this.botName = guy.nickname ?? guy.displayName;
					this.avatarUrl = guy.avatarURL() ?? guy.displayAvatarURL();
					this.sendReply(message.channel as TextChannel, this.getResponse());
				})
				.catch((error) => {
					console.error(error);
					return;
				});
		}
	}
}
