import { BotIdentity } from "@/starbunk/types/botIdentity";
import { Message, TextChannel } from "discord.js";
import { AttitudeBotConfig } from "../config/attitudeBotConfig";
import ReplyBot from "../replyBot";
// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class AttitudeBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'Xander Crews';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: AttitudeBotConfig.Name,
			avatarUrl: AttitudeBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasAttitude = AttitudeBotConfig.Patterns.Default?.test(content);

		if (hasAttitude) {
			await this.sendReply(message.channel as TextChannel, AttitudeBotConfig.Responses.Default);
		}
	}
}
