import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

export default function createBabyBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('BabyBot', webhookServiceParam)
		.withAvatar('https://i.redd.it/qc9qus78dc581.jpg')
		.withPatternTrigger(/\b(baby)\b/i)
		.respondsWithStatic('https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif')
		.build();
}
