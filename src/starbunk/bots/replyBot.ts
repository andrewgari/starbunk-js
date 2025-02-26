import { Message, TextChannel } from 'discord.js';
import { MessageInfo } from '../../discord/messageInfo';
import webhookService, { WebhookService } from '../../webhooks/webhookService';
import { BotIdentity, ResponseGenerator, TriggerCondition } from './botTypes';

export default class ReplyBot {
	protected webhookService: WebhookService;
	private identity: BotIdentity;
	private trigger: TriggerCondition;
	private responseGenerator: ResponseGenerator;

	constructor(
		identity: BotIdentity,
		trigger: TriggerCondition,
		responseGenerator: ResponseGenerator,
		webhookServiceParam: WebhookService | unknown = webhookService
	) {
		this.identity = identity;
		this.trigger = trigger;
		this.responseGenerator = responseGenerator;
		this.webhookService = webhookServiceParam instanceof WebhookService
			? webhookServiceParam
			: webhookService;
	}

	// For testing purposes
	getIdentity(): BotIdentity {
		return this.identity;
	}

	// Create message options for better testability
	protected getMessageOptions(content: string): MessageInfo {
		return {
			username: this.identity.name,
			avatarURL: this.identity.avatarUrl,
			content,
			embeds: [],
		};
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot || this.isSelf(message)) return;

		if (await this.trigger.shouldTrigger(message)) {
			const response = await this.responseGenerator.generateResponse(message);
			await this.sendReply(message.channel as TextChannel, response);
		}
	}

	protected async sendReply(channel: TextChannel, response: string): Promise<void> {
		const messageOptions = this.getMessageOptions(response);
		await this.webhookService.writeMessage(channel, messageOptions);
	}

	protected isSelf(message: Message): boolean {
		return message.author.bot && message.author.username === this.identity.name;
	}
}
