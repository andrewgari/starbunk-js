"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const discord_js_1 = require("discord.js");
const logger_1 = require("../observability/logger");
const WEBHOOK_NAME = 'BunkBot';
class WebhookService {
    webhookClient = null;
    client;
    constructor(client) {
        this.client = client;
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
            this.webhookClient = new discord_js_1.WebhookClient({ url: webhookUrl });
            logger_1.logger.info('Webhook client initialized from URL');
        }
        else {
            logger_1.logger.debug('No webhook URL provided, will create webhooks per channel');
        }
    }
    async send(message, identity, responseText) {
        logger_1.logger.debug('Sending webhook message', {
            channel_id: message.channelId,
            identity_name: identity.botName,
            response_length: responseText.length,
        });
        const channel = await this.getTextChannel(message.channelId);
        const webhook = await this.getOrCreateWebhook(channel);
        await webhook.send({
            content: responseText,
            username: identity.botName,
            avatarURL: identity.avatarUrl,
            embeds: message.embeds,
        });
        logger_1.logger.info('Webhook message sent successfully', {
            channel_id: message.channelId,
            channel_name: channel.name,
            identity_name: identity.botName,
            webhook_id: webhook.id,
        });
        return webhook;
    }
    async clearWebhooks(guildId) {
        logger_1.logger.info('Clearing webhooks from guild', { guild_id: guildId });
        try {
            const guild = await this.client.guilds.fetch(guildId);
            const webhooks = await guild.fetchWebhooks();
            const starbunkWebhooks = webhooks.filter((wh) => wh.name === WEBHOOK_NAME);
            logger_1.logger.info(`Found ${starbunkWebhooks.size} webhooks to clear`, {
                guild_id: guildId,
                webhook_count: starbunkWebhooks.size,
            });
            for (const webhook of starbunkWebhooks.values()) {
                await webhook.delete('Clearing Starbunk webhooks');
                logger_1.logger.debug('Webhook deleted', {
                    webhook_id: webhook.id,
                    webhook_name: webhook.name,
                });
            }
            logger_1.logger.info(`Cleared webhooks from guild`, {
                guild_id: guildId,
                webhooks_cleared: starbunkWebhooks.size,
            });
            return starbunkWebhooks.size;
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear webhooks from guild`, error, {
                guild_id: guildId,
            });
            return 0;
        }
    }
    async getOrCreateWebhook(channel) {
        const channelId = channel.id;
        const channelType = channel.type;
        if (!('fetchWebhooks' in channel) || !('createWebhook' in channel)) {
            logger_1.logger.error('Channel does not support webhooks', undefined, {
                channel_id: channelId,
                channel_type: channelType,
            });
            throw new Error(`Channel ${channelId} does not support webhooks`);
        }
        logger_1.logger.debug('Fetching webhooks for channel', { channel_id: channelId });
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find((wh) => wh.name === WEBHOOK_NAME || wh.name.startsWith(WEBHOOK_NAME + ' '));
        if (webhook) {
            logger_1.logger.debug('Using existing webhook', {
                channel_id: channelId,
                webhook_id: webhook.id,
                webhook_name: webhook.name,
            });
        }
        else {
            logger_1.logger.info('Creating new webhook for channel', {
                channel_id: channelId,
                channel_name: channel.name,
                webhook_name: WEBHOOK_NAME,
            });
            webhook = await channel.createWebhook({
                name: WEBHOOK_NAME,
                reason: 'BunkBot message delivery',
            });
            logger_1.logger.info('Webhook created successfully', {
                channel_id: channelId,
                webhook_id: webhook.id,
                webhook_name: webhook.name,
            });
        }
        return webhook;
    }
    async getTextChannel(channelId) {
        logger_1.logger.debug('Fetching text channel', { channel_id: channelId });
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            logger_1.logger.error('Channel is not a text channel', undefined, {
                channel_id: channelId,
                channel_type: channel?.type,
            });
            throw new Error(`Channel ${channelId} is not a text channel`);
        }
        logger_1.logger.debug('Text channel fetched successfully', {
            channel_id: channelId,
            channel_name: channel.name,
        });
        return channel;
    }
}
exports.WebhookService = WebhookService;
