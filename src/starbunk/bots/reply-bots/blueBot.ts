import { Message, TextChannel } from 'discord.js';
import OpenAI from 'openai';
import userId from '../../../discord/userId';
import { Logger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BlueBot extends ReplyBot {
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: BlueBotConfig.Name,
			avatarUrl: BlueBotConfig.Avatars.Default
		};
	}

	private _blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private readonly logger = new Logger();
	private readonly openAIClient: OpenAI | null;

	constructor() {
		super();
		// Initialize OpenAI client directly
		const apiKey = process.env.OPENAI_API_KEY;
		if (apiKey) {
			this.openAIClient = new OpenAI({
				apiKey: apiKey
			});
			this.logger.debug('OpenAI client initialized');
		} else {
			this.logger.error('OpenAI API key not found in environment variables');
			this.openAIClient = null;
		}
	}

	public get blueTimestamp(): Date {
		return this._blueTimestamp;
	}

	public get blueMurderTimestamp(): Date {
		return this._blueMurderTimestamp;
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const channel = message.channel as TextChannel;

		if (content.includes('blue')) {
			this._blueTimestamp = new Date();
			this.logger.debug(`BlueBot responding to message: ${content}`);
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Default
				},
				content: BlueBotConfig.Responses.Default
			});
			return;
		}

		if (await this.isVennInsultingBlu(message)) {
			this._blueMurderTimestamp = new Date();
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Murder
				},
				content: BlueBotConfig.Responses.Murder
			});
			return;
		}

		if (this.isSomeoneAskingToBeBlue(message)) {
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Default
				},
				content: BlueBotConfig.Responses.Request(message.content)
			});
			return;
		}

		if (this.isSomeoneRespondingToBlu(message)) {
			const responses = BlueBotConfig.Responses.Cheeky;
			const randomIndex = Math.floor(Math.random() * responses.length);
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Cheeky
				},
				content: responses[randomIndex]
			});
			return;
		}

		// Use AI to check for blue references
		if (await this.checkIfBlueIsSaid(message)) {
			this._blueTimestamp = new Date();
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Default
				},
				content: BlueBotConfig.Responses.Default
			});
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

	private async isVennInsultingBlu(message: Message): Promise<boolean> {
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		if (!isTargetUser) return false;

		const content = message.content;
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);
		if (!isMean) return false;

		const messageDate = new Date(message.createdTimestamp);
		const isMurderCooldownOver = isOlderThan(this.blueMurderTimestamp, 1, TimeUnit.DAY, messageDate);
		const isRecentBlueReference = isWithinTimeframe(this.blueTimestamp, 2, TimeUnit.MINUTE, messageDate);

		return isMurderCooldownOver && isRecentBlueReference;
	}

	private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		try {
			// First try a simple check for common blue words
			const content = message.content.toLowerCase();
			const blueWords = ['blue', 'blu', 'azul', 'blau', 'azure', 'bloo', 'bl u'];
			if (blueWords.some(word => content.includes(word))) {
				return true;
			}

			// If no direct match and OpenAI client is initialized, use AI for more sophisticated detection
			if (this.openAIClient) {
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
					max_tokens: 11,
					temperature: 0.2,
				});

				return response.choices[0].message.content?.trim().toLowerCase() === 'yes';
			}

			// Fall back to simple check if OpenAI client is not initialized
			return false;
		} catch (error) {
			this.logger.error('Error checking for blue reference', error as Error);
			// Fall back to simple check if AI fails
			return false;
		}
	}

	private isSomeoneAskingToBeBlue(message: Message): boolean {
		const content = message.content;
		return BlueBotConfig.Patterns.Nice?.test(content) ?? false;
	}
}
