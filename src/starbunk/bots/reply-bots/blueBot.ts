import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import { OpenAIClient } from '../../../openai/openaiClient';
import { Logger } from '../../../services/Logger';
import ReplyBot from '../replyBot';
import { BotConstants, getBotAvatar, getBotPattern, getBotResponse } from './botConstants';

export default class BlueBot extends ReplyBot {
	private blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _avatarUrl: string = BotConstants.Blue.Avatars.Default;
	public readonly botName: string = BotConstants.Blue.Name;

	// Public getters
	get avatarUrl(): string {
		return this._avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (this.isSomeoneAskingYouToBeBlue(message)) {
			Logger.debug(`User ${message.author.username} asked BlueBot to be nice`);
			if (getBotPattern('Blue', 'Nice')?.test(message.content)) {
				Logger.debug(`${message.author.username} asked about Venn - responding with contempt`);
				this.sendReply(
					message.channel as TextChannel,
					getBotResponse('Blue', 'Nice', message.author.displayName)
				);
			}

			Logger.debug(`Being nice to ${name} as requested by ${message.author.username}`);
			return;
		}

		if (this.isVennInsultingBlu(message)) {
			Logger.warn(`Venn is being mean again! Message: "${message.content}"`);
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
			Logger.debug('AI detected blue reference in message');
			this.sendReply(message.channel as TextChannel, getBotResponse('Blue', 'Default'));
		}
	}

	private isSomeoneRespondingToBlu(message: Message): boolean {
		if (BotConstants.Blue.Patterns?.Confirm?.test(message.content) || BotConstants.Blue.Patterns?.Mean?.test(message.content)) {
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
			Logger.debug('Checking message for blue references via AI');
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

			Logger.debug(`AI response: ${response.choices[0].message.content}`);
			return response.choices[0].message.content?.trim().toLowerCase() === 'yes';
		} catch (error) {
			Logger.error('Error checking for blue reference', error as Error);
			return false;
		}
	}

	private isSomeoneAskingYouToBeBlue(message: Message): boolean {
		return BotConstants.Blue.Patterns?.Nice?.test(message.content) ?? false;
	}
}
