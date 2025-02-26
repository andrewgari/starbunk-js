import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createSpiderBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const spiderManCondition = new PatternCondition(Patterns.SPIDER_MAN);

	return new BotBuilder('Spider-Bot', webhookServiceParam)
		.withAvatar('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg')
		.withCustomTrigger(spiderManCondition)
		.respondsWithStatic("Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb")
		.build();
}
