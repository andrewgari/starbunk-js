"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const discord_js_1 = require("discord.js");
const webhook_service_1 = require("./webhook-service");
const logger_1 = require("../observability/logger");
class DiscordService {
    static instance = null;
    client = null;
    webhookService = null;
    constructor() {
        logger_1.logger.debug('DiscordService instance created');
    }
    static getInstance() {
        if (!DiscordService.instance) {
            DiscordService.instance = new DiscordService();
        }
        return DiscordService.instance;
    }
    setClient(client) {
        this.client = client;
        this.webhookService = new webhook_service_1.WebhookService(this.client);
        logger_1.logger.info('Discord client set in DiscordService', {
            user_id: client.user?.id,
            user_tag: client.user?.tag,
        });
    }
    getClient() {
        if (!this.client) {
            logger_1.logger.error('Discord client not initialized');
            throw new Error('Discord client not initialized. Call setClient first.');
        }
        return this.client;
    }
    getWebhookService() {
        if (!this.webhookService) {
            logger_1.logger.error('Webhook service not initialized');
            throw new Error('Webhook service not initialized. Call setClient first.');
        }
        return this.webhookService;
    }
    async getMemberById(guildId, memberId) {
        if (!this.client) {
            logger_1.logger.error('Discord client not initialized');
            throw new Error('Discord client not initialized. Call setClient first.');
        }
        logger_1.logger.debug('Fetching guild member', {
            guild_id: guildId,
            member_id: memberId,
        });
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(memberId);
        logger_1.logger.debug('Guild member fetched', {
            guild_id: guildId,
            member_id: memberId,
            member_name: member.user.username,
            member_nickname: member.nickname,
        });
        return member;
    }
    async getChannel(channelId) {
        if (!this.client) {
            logger_1.logger.error('Discord client not initialized');
            throw new Error('Discord client not initialized. Call setClient first.');
        }
        logger_1.logger.debug('Fetching channel', { channel_id: channelId });
        const channel = await this.client.channels.fetch(channelId);
        if (!(channel instanceof discord_js_1.TextChannel)) {
            logger_1.logger.error('Channel is not a text channel', undefined, {
                channel_id: channelId,
                channel_type: channel?.type,
            });
            throw new Error(`Channel is not a text channel: ${channelId}`);
        }
        logger_1.logger.debug('Channel fetched', {
            channel_id: channelId,
            channel_name: channel.name,
        });
        return channel;
    }
    async getBotIdentityFromDiscord(guildId, memberId) {
        logger_1.logger.debug('Resolving bot identity from Discord', {
            guild_id: guildId,
            member_id: memberId,
        });
        const member = await this.getMemberById(guildId, memberId);
        const identity = {
            botName: member.nickname || member.user.username,
            avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }) ||
                member.user.displayAvatarURL({ size: 256, extension: 'png' }),
        };
        logger_1.logger.debug('Bot identity resolved', {
            guild_id: guildId,
            member_id: memberId,
            bot_name: identity.botName,
        });
        return identity;
    }
    async sendMessageWithBotIdentity(message, botIdentity, responseText) {
        if (!this.webhookService) {
            logger_1.logger.error('Webhook service not initialized');
            throw new Error('Webhook service not initialized. Call setClient first.');
        }
        logger_1.logger.debug('Sending message with bot identity', {
            channel_id: message.channelId,
            guild_id: message.guildId,
            bot_name: botIdentity.botName,
            response_length: responseText.length,
        });
        await this.webhookService.send(message, botIdentity, responseText);
        logger_1.logger.debug('Message sent with bot identity', {
            channel_id: message.channelId,
            bot_name: botIdentity.botName,
        });
    }
}
exports.DiscordService = DiscordService;
