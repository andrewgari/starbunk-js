import { Message, TextChannel } from 'discord.js';
import { getRandomMemberExcept } from '../../../discord/discordGuildMemberHelper';
import { Logger } from '../../../services/services';
import Random from '../../../utils/random';
import { BotIdentity } from '../botIdentity';
import { InterruptBotConfig } from '../config/interruptBotConfig';
import ReplyBot from '../replyBot';

export default class InterruptBot extends ReplyBot {
	constructor(private readonly logger: Logger) {
		super();
	}

	protected get botIdentity(): BotIdentity {
		return this._botIdentity = {
			userId: '',
			avatarUrl: InterruptBotConfig.Avatars.Default,
			botName: InterruptBotConfig.Name
		};
	}

	async handleMessage(message: Message): Promise<void> {
		// Ignore bot messages and self messages
		if (message.author.bot || this.isSelf(message)) return;

		// In debug mode, always trigger (100% chance)
		// Otherwise, 1% chance to trigger
		const percentChance = process.env.DEBUG_MODE === 'true' ? 100 : 1;
		const shouldInterrupt = Random.percentChance(percentChance);
		if (!shouldInterrupt) return;

		// Get guild members
		const guild = message.guild;
		if (!guild) return;

		try {
			// Get a random member that's not the message author
			const randomMember = await getRandomMemberExcept(guild, message.author.id);
			if (!randomMember) return;

			// Create the interrupted message
			const interruptedMessage = InterruptBotConfig.Responses.createInterruptedMessage(message.content);

			// Send the reply with the random member's identity
			await this.sendReply(message.channel as TextChannel, {
				botIdentity: {
					userId: '',
					botName: randomMember.displayName || randomMember.user.username,
					avatarUrl: randomMember.displayAvatarURL() || randomMember.user.displayAvatarURL()
				},
				content: interruptedMessage
			});
		} catch (error) {
			this.logger.error(`InterruptBot: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
