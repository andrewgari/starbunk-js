import { Message } from 'discord.js';
import { BotRegistry } from '../../bot-registry';
import { logger } from '@starbunk/shared';
import { getDiscordService } from '../../services/bootstrap';
import { getMessageFilter } from '../../services/message-filter';
import { ReplyBotImpl } from '../../core/bot-builder';
import { E2E_STATUS_PATTERN, E2E_LOADED_PREFIX, E2E_IDENT_PREFIX, DEFAULT_VENN_ID, DEFAULT_GUY_ID } from './constants';

const BOT_NAME = 'E2EStatusBot';

function inDebugAndWhitelisted(message: Message): boolean {
	try {
		const mf = getMessageFilter();
		if (!mf.isDebugMode()) return false;
		const allowed = mf.getTestingChannelIds();
		return allowed.includes(message.channelId);
	} catch {
		return false;
	}
}

async function probeIdentity(guildId: string | undefined, userId?: string): Promise<'ok' | 'missing'> {
	if (!guildId || !userId) return 'missing';
	try {
		const ds = getDiscordService();
		await ds.getMemberAsync(guildId, userId);
		return 'ok';
	} catch (e) {
		logger.debug(`[${BOT_NAME}] Identity probe failed for ${userId}:`, e as Error);
		return 'missing';
	}
}

const bot: ReplyBotImpl = {
	name: BOT_NAME,
	description: 'E2E diagnostics: lists loaded bots and required identity availability (debug-only).',
	async shouldRespond(message: Message): Promise<boolean> {
		if (!inDebugAndWhitelisted(message)) return false;
		return E2E_STATUS_PATTERN.test(message.content || '');
	},
	async processMessage(message: Message): Promise<void> {
		if (!(await this.shouldRespond(message))) return;

		// 1) Loaded bots
		const loaded = BotRegistry.getInstance().getReplyBotNames();
		const loadedLine = `${E2E_LOADED_PREFIX} ${loaded.join(',')}`;

		// 2) Identity availability
		const guildId = message.guild?.id || process.env.E2E_TEST_SERVER_ID || process.env.GUILD_ID || '';
		const vennId = process.env.E2E_ID_VENN || DEFAULT_VENN_ID;
		const guyId = process.env.E2E_ID_GUY || DEFAULT_GUY_ID;
		// Prefer generic test member ID; fall back to legacy var for compatibility
		const sigId = process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT; // no sane default available

		const venn = await probeIdentity(guildId, vennId);
		const guy = await probeIdentity(guildId, guyId);
		const sig = await probeIdentity(guildId, sigId);

		const identLine = `${E2E_IDENT_PREFIX} venn:${venn},guy:${guy},siggreat:${sig}`;

		const ds = getDiscordService();
		await ds.sendMessage(message.channelId, loadedLine);
		await ds.sendMessage(message.channelId, identLine);
	},
};

export default bot;
