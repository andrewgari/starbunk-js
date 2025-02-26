import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createBabyBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const babyCondition = new PatternCondition(Patterns.BABY);

	return new BotBuilder('BabyBot', webhookServiceParam)
		.withAvatar('https://i.redd.it/qc9qus78dc581.jpg')
		.withCustomTrigger(babyCondition)
		.respondsWithStatic('https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif')
		.build();
}
