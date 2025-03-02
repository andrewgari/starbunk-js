import userID from "@/discord/userID";
import { BotIdentity } from "@/starbunk/bots/botTypes";
import { getUserIdentity } from "@/starbunk/bots/identity/userIdentity";
import { Message } from "discord.js";
import { BOT_NAME, GUY_BOT_AVATAR_URL } from "../guyBotModel";

/**
 * Identity updater for GuyBot
 * If the message is from Guy, use Guy's identity
 * Otherwise, use the default GuyBot identity
 */
export async function updateGuyBotIdentity(message: Message): Promise<BotIdentity> {
	// If the message is from Guy, use Guy's identity
	if (message.author.id === userID.Guy) {
		return await getUserIdentity(message);
	}

	// Otherwise, use the default GuyBot identity
	return {
		name: BOT_NAME,
		avatarUrl: GUY_BOT_AVATAR_URL
	};
}
