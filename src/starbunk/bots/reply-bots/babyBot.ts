import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

export default function createBabyBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('BabyBot', webhookServiceParam)
		.withAvatar('https://i.redd.it/qc9qus78dc581.jpg')
		.withPatternTrigger(Patterns.WORD_BABY)
		.respondsWithStatic('https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif')
		.build();
}
