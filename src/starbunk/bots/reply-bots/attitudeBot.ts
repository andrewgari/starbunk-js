import { Message, TextChannel } from "discord.js";
import { Service, ServiceId } from "../../../services/services";
import { AttitudeBotConfig } from "../config/attitudeBotConfig";
import ReplyBot from "../replyBot";

@Service({
	id: ServiceId.AttitudeBot,
	scope: 'singleton'
})
export default class AttitudeBot extends ReplyBot {
	public readonly botName: string = AttitudeBotConfig.Name;
	public readonly avatarUrl: string = AttitudeBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'AttitudeBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasAttitude = AttitudeBotConfig.Patterns.Default?.test(content);

		if (hasAttitude) {
			this.sendReply(message.channel as TextChannel, AttitudeBotConfig.Responses.Default);
		}
	}
}
