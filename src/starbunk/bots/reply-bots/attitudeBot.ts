import { BotIdentity } from "@/starbunk/types/botIdentity";
import { Message, TextChannel } from "discord.js";
import { AttitudeBotConfig } from "../config/attitudeBotConfig";
import ReplyBot from "../replyBot";
// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class AttitudeBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			botName: AttitudeBotConfig.Name,
			avatarUrl: AttitudeBotConfig.Avatars.Default
		};
	}

	protected get defaultBotName(): string {
		return 'AttitudeBot';
	}

	protected async processMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasAttitude = AttitudeBotConfig.Patterns.Default?.test(content);

		if (hasAttitude) {
			this.sendReply(message.channel as TextChannel, AttitudeBotConfig.Responses.Default);
		}
	}
}
