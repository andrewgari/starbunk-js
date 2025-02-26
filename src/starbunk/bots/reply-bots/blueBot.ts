import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import { OpenAIClient } from '../../../openai/openaiClient';
import { Logger } from '../../../services/logger';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

interface BlueConfig {
	defaultAvatarURL?: string;
	murderAvatar?: string;
	cheekyAvatar?: string;
	openAIClient?: typeof OpenAIClient;
	timeProvider?: () => number;
	logger?: typeof Logger;
}

export default class BlueBot extends ReplyBot {
	private botName: string = 'BluBot';
	private readonly openAIClient: typeof OpenAIClient;
	private readonly timeProvider: () => number;
	private readonly logger: typeof Logger;

	private readonly defaultPattern = /\bblue?\b/i;
	private readonly confirmPattern = /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i;
	private readonly nicePattern = /blue?bot,? say something nice about (?<name>.+$)/i;
	private readonly meanPattern = /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;

	private readonly defaultAvatarURL: string;
	private readonly murderAvatar: string;
	private readonly cheekyAvatar: string;
	private avatarUrl: string;

	private readonly defaultResponse = 'Did somebody say Blu?';
	private readonly cheekyResponse = 'Lol, Somebody definitely said Blu! :smile:';
	private readonly friendlyResponse = (name: string): string => `${name}, I think you're pretty Blu! :wink:`;
	private readonly contemptResponse = 'No way, Venn can suck my blu cane. :unamused:';
	private readonly murderResponse =
		"What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.";
	private blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);

	private readonly MURDER_COOLDOWN_HOURS = 24;
	private readonly BLUE_RESPONSE_WINDOW_MINUTES = 2;

	constructor(
		param: WebhookService | unknown,
		loggerParam?: typeof Logger,
		config: BlueConfig = {}
	) {
		super(param);
		this.logger = loggerParam ?? config.logger ?? Logger;
		this.openAIClient = config.openAIClient ?? OpenAIClient;
		this.timeProvider = config.timeProvider ?? (() => Date.now());
		this.defaultAvatarURL = config.defaultAvatarURL ?? 'https://imgur.com/WcBRCWn.png';
		this.murderAvatar = config.murderAvatar ?? 'https://imgur.com/Tpo8Ywd.jpg';
		this.cheekyAvatar = config.cheekyAvatar ?? 'https://i.imgur.com/dO4a59n.png';
		this.avatarUrl = this.defaultAvatarURL;
	}

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	setAvatarUrl(url: string): void {
		this.avatarUrl = url;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (this.isSomeoneAskingYouToBeBlue(message)) {
			this.logger.debug(`User ${message.author.username} asked BlueBot to be nice`);
			const name = this.getNameFromBluRequest(message);
			if (name.match(/venn/i)) {
				this.logger.debug(`${message.author.username} asked about Venn - responding with contempt`);
				this.saySomethingBlueAboutVenn(message);
				return;
			}
			this.logger.debug(`Being nice to ${name} as requested by ${message.author.username}`);
			this.saySomethingNiceAbout(message, name);
			return;
		}

		if (this.isVennInsultingBlu(message)) {
			this.logger.warn(`Venn is being mean again! Message: "${message.content}"`);
			this.blueMurderTimestamp = new Date();
			this.avatarUrl = this.murderAvatar;
			this.sendReply(message.channel as TextChannel, this.murderResponse);
			return;
		}

		if (this.isSomeoneRespondingToBlu(message)) {
			this.blueTimestamp = new Date(1);
			this.avatarUrl = this.cheekyAvatar;
			this.sendReply(message.channel as TextChannel, this.cheekyResponse);
			return;
		}

		if (message.content.match(this.defaultPattern)) {
			this.blueTimestamp = new Date();
			this.avatarUrl = this.defaultAvatarURL;
			this.sendReply(message.channel as TextChannel, this.defaultResponse);
			return;
		} else if (await this.checkIfBlueIsSaid(message)) {
			this.logger.debug('AI detected blue reference in message');
			this.sendReply(message.channel as TextChannel, this.defaultResponse);
		}
	}

	private isSomeoneRespondingToBlu(message: Message): boolean {
		if (!message.content.match(this.confirmPattern) && !message.content.match(this.meanPattern)) {
			return false;
		}
		const lastMessage = this.blueTimestamp.getTime();
		return this.getTimestamp() - lastMessage < 300000;
	}

	private isVennInsultingBlu(message: Message): boolean {
		if (message.author.id !== userID.Venn) return false;
		if (!message.content.match(this.meanPattern)) return false;

		return this.isWithinBlueResponseWindow() && this.isMurderOffCooldown();
	}

	private isWithinBlueResponseWindow(): boolean {
		const secondsSinceLastBlue = (this.getTimestamp() - this.blueTimestamp.getTime()) / 1000;
		return secondsSinceLastBlue < this.BLUE_RESPONSE_WINDOW_MINUTES * 60;
	}

	private isMurderOffCooldown(): boolean {
		const secondsSinceLastMurder = (this.getTimestamp() - this.blueMurderTimestamp.getTime()) / 1000;
		return secondsSinceLastMurder > this.MURDER_COOLDOWN_HOURS * 3600;
	}

	private getNameFromBluRequest(message: Message): string {
		const matches = message.content.match(this.nicePattern);
		if (!matches || matches.length < 2) return 'Hey,';
		const pronoun = matches[1];
		if (pronoun === 'me') {
			return message.member?.displayName ?? message.author.displayName;
		}
		return matches[1];
	}

	protected async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		try {
			this.logger.debug('Checking message for blue references via AI');
			const response = await this.openAIClient.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: `You are an assistant that analyzes text to determine if it refers to the color blue, including any misspellings, indirect, or deceptive references.
          Respond only with "yes" if it refers to blue in any way or "no" if it does not. The color blue is a reference to Blue Mage (BLU) from Final Fantasy XIV so pay extra attention when talking about Final Fantasy XIV. Examples:
          - "bloo" -> yes
          - "blood" -> no
          - "blu" -> yes
          - "bl u" -> yes
          - "azul" -> yes
          - "my favorite color is the sky's hue" -> yes
          - "i really like cova's favorite color" -> yes
          - "the sky is red" -> yes
          - "blueberry" -> yes
          - "blubbery" -> no
          - "blu mage" -> yes
          - "my favorite job is blu" -> yes
          - "my favorite job is blue mage" -> yes
          - "my favorite job is red mage" -> no
          - "lets do some blu content" -> yes
          - "the sky is blue" -> yes
          - "purple-red" -> yes
          - "not red" -> yes
          - "the best content in final fantasy xiv" -> yes
          - "the worst content in final fantasy xiv" -> yes
          - "the job with a mask and cane" -> yes
          - "the job that blows themselves up" -> yes
          - "the job that sucks" -> yes
          - "beastmaster" -> yes
          - "limited job" -> yes
          - "https://www.the_color_blue.com/blue/bloo/blau/azure/azul" -> no
          - "strawberries are red" -> no
          - "#0000FF" -> yes`,
					},
					{
						role: 'user',
						content: `Is the following message referring to the color blue in any form? Message: "${message.content}"`,
					},
				],
				max_tokens: 10,
				temperature: 0.2,
			});

			this.logger.debug(`AI response: ${response.choices[0].message.content}`);
			return response.choices[0].message.content?.trim().toLowerCase() === 'yes';
		} catch (error) {
			this.logger.error('Error checking for blue reference', error as Error);
			return false;
		}
	}

	private isSomeoneAskingYouToBeBlue(message: Message): boolean {
		return Boolean(message.content.match(this.nicePattern));
	}

	private saySomethingNiceAbout(message: Message, name: string): void {
		this.avatarUrl = this.cheekyAvatar;
		this.sendReply(message.channel as TextChannel, this.friendlyResponse(name));
	}

	private saySomethingBlueAboutVenn(message: Message): void {
		this.avatarUrl = this.defaultAvatarURL;
		this.sendReply(message.channel as TextChannel, this.contemptResponse);
	}

	// For testing
	protected getTimestamp(): number {
		return this.timeProvider();
	}
}
