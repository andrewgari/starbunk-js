import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { matchesAnyName } from '@/utils/string-similarity';
import { logger } from '@/observability/logger';

export class RequestConfirmStrategy implements BlueStrategy {
  protected niceRegex = /blue?bot,? say something nice about (?<n>.+$)/i;

  protected isRequest(message: Message): boolean {
    return !!message.content.match(this.niceRegex);
  }

  protected getRequestedName(message: Message): string | null {
    const match = message.content.match(this.niceRegex);
    if (match && match.groups && match.groups.n) {
      return match.groups.n;
    }
    return null;
  }

  shouldRespond(message: Message): Promise<boolean> {
    const isRequest = this.isRequest(message);
    const requestedName = this.getRequestedName(message);

    logger
      .withMetadata({
        strategy_name: 'RequestConfirmStrategy',
        is_request: isRequest,
        requested_name: requestedName,
        message_content: message.content,
        message_id: message.id,
      })
      .debug('RequestConfirmStrategy: Evaluating nice request');

    if (isRequest) {
      logger
        .withMetadata({
          strategy_name: 'RequestConfirmStrategy',
          requested_name: requestedName,
          message_id: message.id,
        })
        .info('RequestConfirmStrategy: Nice request detected');
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  async getResponse(message: Message): Promise<string> {
    const friend = this.getFriendFromMessage(message);
    const response = `${friend}, I think you're pretty blue! :wink:`;

    logger
      .withMetadata({
        strategy_name: 'RequestConfirmStrategy',
        requested_name: this.getRequestedName(message),
        resolved_friend: friend,
        response,
        message_id: message.id,
      })
      .info('RequestConfirmStrategy: Generated compliment response');

    return Promise.resolve(response);
  }

  public getFriendFromMessage(message: Message): string {
    // get a baseline, we can at least repeat what they said.
    let friend = this.getRequestedName(message) || '';
    let userId = '';

    logger
      .withMetadata({
        strategy_name: 'RequestConfirmStrategy',
        requested_name: friend,
        message_id: message.id,
      })
      .debug('RequestConfirmStrategy: Resolving friend identity');

    // if the request is for the requester, then get their user name and mention them
    if (friend.toLowerCase() === 'me') {
      userId = message.author.id;
      logger
        .withMetadata({
          strategy_name: 'RequestConfirmStrategy',
          resolution_method: 'self_reference',
          user_id: userId,
          message_id: message.id,
        })
        .debug('RequestConfirmStrategy: Resolved as self-reference');
    }

    // if the request is a user mention, take the id from the mention and retrieve the member and mention them
    const userMentionRegex = /<@!?(\d+)>/;
    // Get the user ID from the mention. Look up user from client.
    const match = friend.match(userMentionRegex);
    if (match && match.length > 1) {
      userId = match[1];
      logger
        .withMetadata({
          strategy_name: 'RequestConfirmStrategy',
          resolution_method: 'user_mention',
          user_id: userId,
          message_id: message.id,
        })
        .debug('RequestConfirmStrategy: Resolved via user mention');
    }

    // if the request was for a user by name, then try to find the user and get their id
    const member = message.guild?.members?.cache.find(member => {
      return matchesAnyName(friend, [member.nickname, member.user.username]);
    });

    if (member) {
      userId = member.id;
      logger
        .withMetadata({
          strategy_name: 'RequestConfirmStrategy',
          resolution_method: 'name_match',
          user_id: userId,
          matched_nickname: member.nickname,
          matched_username: member.user.username,
          message_id: message.id,
        })
        .debug('RequestConfirmStrategy: Resolved via name matching');
    }

    if (userId) {
      friend = `<@${userId}>`;
    }

    logger
      .withMetadata({
        strategy_name: 'RequestConfirmStrategy',
        original_name: this.getRequestedName(message),
        resolved_friend: friend,
        has_user_id: !!userId,
        message_id: message.id,
      })
      .debug('RequestConfirmStrategy: Friend identity resolved');

    return friend;
  }
}
