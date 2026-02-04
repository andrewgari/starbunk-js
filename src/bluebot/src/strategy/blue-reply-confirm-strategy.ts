import { Message } from 'discord.js';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';

export class ReplyConfirmStrategy extends SendAPIMessageStrategy {
  readonly name = 'BlueReplyConfirmStrategy';
  readonly priority = 30;
  private currentMessage: Message | null = null;

  private confirmPhrases = [
    /\bblue\b/i,
    /\b(blue?bot|bot)\b/i,
    /\b(yes|yep|yeah|yup|sure)\b/i,
    /\b(no|nope|nah)\b/i,
    /\bi did(n't| not)?\b/i,
    /\byou got it\b/i,
    /\bsure did\b/i,
    /\bstupid\b/i,
    /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i, // mean words
  ];

  async shouldTrigger(message: Message): Promise<boolean> {
    this.currentMessage = message;
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
      .debug('Reply ConfirmStrategy: Evaluating confirmation');

    // Check if it's a reply to the bot
    if (isReply) {
      logger
        .withMetadata({
          strategy_name: 'ReplyConfirmStrategy',
          trigger_reason: 'is_reply',
          reply_to_message_id: message.reference?.messageId,
          message_id: message.id,
        })
        .info(`${this.name}: Matched - is reply to bot`);
      return Promise.resolve(true);
    }

    // Confirmations are short AND contain a confirmation phrase
    if (isShort && hasConfirmPhrase) {
      logger
        .withMetadata({
          strategy_name: 'ReplyConfirmStrategy',
          trigger_reason: 'short_message',
          word_count: wordCount,
          matched_phrase: matchedPhrase?.source,
          message_id: message.id,
        })
        .info(`${this.name}: Matched - short message with confirmation phrase`);
      return Promise.resolve(true);
    }

    logger
      .withMetadata({
        message_id: message.id,
      })
      .debug(`${this.name}: No match`);

    return Promise.resolve(false);
  }

  async getResponse(_context: Message): Promise<string> {
    const response = 'Somebody definitely said Blu!';
    logger
      .withMetadata({
        strategy_name: this.name,
        response,
        message_id: this.currentMessage?.id,
      })
      .info(`${this.name}: Generating confirmation response`);
    return Promise.resolve(response);
  }
}
