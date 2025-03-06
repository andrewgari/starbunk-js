import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import { OpenAIClient } from '../../../openai/openaiClient';
import { ILogger } from '../../../services/Logger';
import { Service } from '../../../services/ServiceRegistrar';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import { IWebhookService } from '../../../webhooks/webhookService';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

/**
 * BlueBot responds to messages containing blue references
 * Refactored to use the enhanced dependency injection system
 */
@Service({
	key: 'blue-bot',
	dependencies: [ServiceRegistry.LOGGER, ServiceRegistry.WEBHOOK_SERVICE]
})
export default class BlueBotRefactored extends ReplyBot {
	private blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _avatarUrl: string = getBotAvatar('Blue', 'Default');
	public readonly botName: string = getBotName('Blue');
	private readonly openAIClient: typeof OpenAIClient;

	constructor(
		logger: ILogger,
		webhookService: IWebhookService,
		openAIClient: typeof OpenAIClient = OpenAIClient
	) {
		super(logger, webhookService);
		this.openAIClient = openAIClient;
	}

	// Public getters
	get avatarUrl(): string {
		return this._avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (this.isSomeoneAskingYouToBeBlue(message)) {
			this.logger.debug(`User ${message.author.username} asked BlueBot to be nice`);
			if (getBotPattern('Blue', 'Nice')?.test(message.content)) {
				this.logger.debug(`${message.author.username} asked about Venn - responding with contempt`);
				this.sendReply(
					message.channel as TextChannel,
					getBotResponse('Blue', 'Request', message.content)
				);
			}

			return;
		}

		if (this.isVennInsultingBlu(message)) {
			this.logger.warn(`Venn is being mean again! Message: "${message.content}"`);
			this.blueMurderTimestamp = new Date();
			this._avatarUrl = getBotAvatar('Blue', 'Murder');
			this.sendReply(message.channel as TextChannel, getBotResponse('Blue', 'Murder'));
			return;
		}

		if (this.isSomeoneRespondingToBlu(message)) {
			this.blueTimestamp = new Date(1);
			this._avatarUrl = getBotAvatar('Blue', 'Cheeky');
			this.sendReply(message.channel as TextChannel, getBotResponse('Blue', 'Cheeky'));
			return;
		}

		if (getBotPattern('Blue', 'Default')?.test(message.content)) {
			this.blueTimestamp = new Date();
			this._avatarUrl = getBotAvatar('Blue', 'Default');
			this.sendReply(message.channel as TextChannel, getBotResponse('Blue', 'Default'));
			return;
		} else if (await this.checkIfBlueIsSaid(message)) {
			this.logger.debug('AI detected blue reference in message');
			this.sendReply(message.channel as TextChannel, getBotResponse('Blue', 'Default'));
		}
	}

	private isSomeoneRespondingToBlu(message: Message): boolean {
		if (getBotPattern('Blue', 'Confirm')?.test(message.content) || getBotPattern('Blue', 'Mean')?.test(message.content)) {
			const lastMessage = this.blueTimestamp.getTime();
			return message.createdTimestamp - lastMessage < 300000;
		}
		return false;
	}

	private isVennInsultingBlu(message: Message): boolean {
		if (message.author.id !== userID.Venn) return false;
		if (!getBotPattern('Blue', 'Mean')?.test(message.content)) return false;
		const lastMurder = this.blueMurderTimestamp.getTime() / 1000;
		const lastBlue = this.blueTimestamp.getTime() / 1000;
		const current = new Date(message.createdTimestamp).getTime() / 1000;
		// if the last murder message was at least 24 hours ago
		return current - lastMurder > 86400 && current - lastBlue < 2 * 60;
	}

	private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
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
		return getBotPattern('Blue', 'Nice')?.test(message.content) ?? false;
	}
}