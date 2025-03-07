import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { OpenAIClient } from '../../../openai/openaiClient';
import { ILogger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';

export default class BlueBot extends ReplyBot {
	private _blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _avatarUrl: string = BlueBotConfig.Avatars.Default;

	public readonly botName: string = BlueBotConfig.Name;

	constructor(logger?: ILogger) {
		super(logger);
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	get blueTimestamp(): Date {
		return this._blueTimestamp;
	}

	get blueMurderTimestamp(): Date {
		return this._blueMurderTimestamp;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (this.isSomeoneAskingYouToBeBlue(message)) {
			this.logger.debug(`User ${message.author.username} asked BlueBot to be nice`);
			const content = message.content;
			const isNice = BlueBotConfig.Patterns.Nice?.test(content);

			if (isNice) {
				this.logger.debug(`${message.author.username} asked about Venn - responding with contempt`);
				this.sendReply(
					message.channel as TextChannel,
					BlueBotConfig.Responses.Request(content)
				);
			}

			return;
		}

		if (this.isVennInsultingBlu(message)) {
			this.logger.warn(`Venn is being mean again! Message: "${message.content}"`);
			this._blueMurderTimestamp = new Date();
			this._avatarUrl = BlueBotConfig.Avatars.Murder;
			this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Murder);
			return;
		}

		if (this.isSomeoneRespondingToBlu(message)) {
			this._blueTimestamp = new Date(1);
			this._avatarUrl = BlueBotConfig.Avatars.Cheeky;
			this.sendReply(message.channel as TextChannel, BlueBotConfig.getRandomCheekyResponse());
			return;
		}

		const content = message.content;
		const hasBlue = BlueBotConfig.Patterns.Default?.test(content);

		if (hasBlue) {
			this._blueTimestamp = new Date();
			this._avatarUrl = BlueBotConfig.Avatars.Default;
			this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Default);
			return;
		} else if (await this.checkIfBlueIsSaid(message)) {
			this.logger.debug('AI detected blue reference in message');
			this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Default);
		}
	}

	private isSomeoneRespondingToBlu(message: Message): boolean {
		const content = message.content;
		const isConfirm = BlueBotConfig.Patterns.Confirm?.test(content);
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);

		if (isConfirm || isMean) {
			return isWithinTimeframe(this.blueTimestamp, 5, TimeUnit.MINUTE, new Date(message.createdTimestamp));
		}
		return false;
	}

	private isVennInsultingBlu(message: Message): boolean {
		const isVenn = message.author.id === userId.Venn;
		if (!isVenn) return false;

		const content = message.content;
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);
		if (!isMean) return false;

		const messageDate = new Date(message.createdTimestamp);

		// Check if the last murder message was at least 24 hours ago
		const isMurderCooldownOver = isOlderThan(this.blueMurderTimestamp, 1, TimeUnit.DAY, messageDate);

		// Check if there was a blue reference in the last 2 minutes
		const isRecentBlueReference = isWithinTimeframe(this.blueTimestamp, 2, TimeUnit.MINUTE, messageDate);

		return isMurderCooldownOver && isRecentBlueReference;
	}

	private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		try {
			this.logger.debug('Checking message for blue references via AI');
			const response = await OpenAIClient.chat.completions.create({
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
				max_tokens: 11,
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
		const content = message.content;
		return BlueBotConfig.Patterns.Nice?.test(content) ?? false;
	}
}