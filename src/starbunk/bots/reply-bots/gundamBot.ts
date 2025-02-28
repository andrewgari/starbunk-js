import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns'; // Importing the Patterns enum from the patterns file
/**
 * GundamBot - A bot that responds to mentions of Gundam or Gandam
 */

export default function createGundamBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('GundamBot', webhookService)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png')
		.withPatternTrigger(Patterns.WORD_GUNDAM)
		.respondsWithStatic("That's the giant unicorn robot gandam, there i said it")
		.build();
}
