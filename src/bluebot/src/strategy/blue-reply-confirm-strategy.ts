import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { logger } from '@/observability/logger';

export class ReplyConfirmStrategy implements BlueStrategy {
  private confirmPhrases = [
    /blue/i,
    /blue?bot/i,
    /\b(blue?bot|bot)\b/i,
    /\b(yes|yep|yeah|yup|sure)\b/i,
    /\b(no|nope|nah)\b/i,
    /\bi did(n't| not)?\b/i,
    /\byou got it\b/i,
    /\bsure did\b/i,
    /\bstupid\b/i,
  ];

  async shouldRespond(message: Message): Promise<boolean> {
    const isReply = !!message.reference?.messageId;
    const wordCount = message.content.trim().split(/\s+/).length;
    const isShort = wordCount <= 5;
    const matchedPhrase = this.confirmPhrases.find(regex => regex.test(message.content));
    const hasConfirmPhrase = !!matchedPhrase;

    logger
      .withMetadata({
        strategy_name: 'ReplyConfirmStrategy',
        is_reply: isReply,
        reply_to_message_id: message.reference?.messageId,
        word_count: wordCount,
        is_short: isShort,
        has_confirm_phrase: hasConfirmPhrase,
        matched_phrase: matchedPhrase?.source,
        message_content: message.content,
        message_id: message.id,
      })
      .debug('ReplyConfirmStrategy: Evaluating confirmation');

    // Check if it's a reply to the bot
    if (isReply) {
      logger
        .withMetadata({
          strategy_name: 'ReplyConfirmStrategy',
          trigger_reason: 'is_reply',
          reply_to_message_id: message.reference?.messageId,
          message_id: message.id,
        })
        .info('ReplyConfirmStrategy: Matched - is reply to bot');
      return Promise.resolve(true);
    }

    // Confirmations are usually short
    if (isShort) {
      logger
        .withMetadata({
          strategy_name: 'ReplyConfirmStrategy',
          trigger_reason: 'short_message',
          word_count: wordCount,
          message_id: message.id,
        })
        .info('ReplyConfirmStrategy: Matched - short message');
      return Promise.resolve(true);
    }

    if (hasConfirmPhrase) {
      logger
        .withMetadata({
          strategy_name: 'ReplyConfirmStrategy',
          trigger_reason: 'confirm_phrase',
          matched_phrase: matchedPhrase?.source,
          message_id: message.id,
        })
        .info('ReplyConfirmStrategy: Matched - confirmation phrase detected');
      return Promise.resolve(true);
    }

    logger
      .withMetadata({
        strategy_name: 'ReplyConfirmStrategy',
        message_id: message.id,
      })
      .debug('ReplyConfirmStrategy: No match');

    return Promise.resolve(false);
  }

  async getResponse(_message: Message): Promise<string> {
    const response = 'Somebody definitely said Blu!';
    logger
      .withMetadata({
        strategy_name: 'ReplyConfirmStrategy',
        response,
        message_id: _message.id,
      })
      .info('ReplyConfirmStrategy: Generating confirmation response');
    return Promise.resolve(response);
  }
}
