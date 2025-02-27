import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns'; // Importing the Patterns enum from the patterns file
/**
 * GundamBot - A bot that responds to mentions of Gundam or Gandam
 */

export default function createGundamBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('GundamBot', webhookServiceParam)
		.withAvatar('https://cdn.discordapp.com/attachments/854790294253117531/902975839584849930/gundam.png')
		.withPatternTrigger(Patterns.GUNDAM)
		.respondsWithStatic("That's the giant unicorn robot gandam, there i said it")
		.build();
}
