import { Command } from '@starbunk/shared/discord/command-registry';
import pingCommand from '@/commands/ping';
import clearwebhooksCommand from '@/commands/clear-webhooks';
import botCommand from '@/commands/bot';
import commentsCommand from '@/commands/comments';

/**
 * All commands available in BunkBot
 */
export const commands: Command[] = [pingCommand, clearwebhooksCommand, botCommand, commentsCommand];
