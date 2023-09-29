import { Client, Message, TextChannel } from "discord.js";
import webhookService from "src/webhooks/WebhookService";
import WebhookService from "src/webhooks/WebhookService";

abstract class ReplyBot {
	abstract getBotName(): string;
	abstract getAvatarUrl(): string;
	abstract handleMessage(client: Client, message: Message): void;
	sendReply(channel: TextChannel, response: string): void {
		webhookService.writeMessage(channel, {
			username: this.getBotName(),
			avatarURL: this.getAvatarUrl(),
			content: response,
			embeds: []
		});
	}
}