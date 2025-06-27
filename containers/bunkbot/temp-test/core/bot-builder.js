"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReplyBot = exports.validateBotConfig = exports.createBotDescription = exports.createBotReplyName = void 0;
const shared_1 = require("@starbunk/shared");
const discord_js_1 = require("discord.js");
const botDefaults_1 = require("../config/botDefaults");
function createBotReplyName(name) {
    if (!name || name.trim().length === 0) {
        throw new Error('Bot name is required');
    }
    return name;
}
exports.createBotReplyName = createBotReplyName;
function createBotDescription(description) {
    if (!description || description.trim().length === 0) {
        throw new Error('Bot description cannot be empty');
    }
    return description;
}
exports.createBotDescription = createBotDescription;
/**
 * Validate bot configuration and provide defaults
 */
function validateBotConfig(config) {
    // Validate required fields
    if (!config.name || config.name.trim() === '') {
        throw new Error('Bot name is required');
    }
    if (!config.description || config.description.trim() === '') {
        throw new Error('Bot description cannot be empty');
    }
    if (!config.defaultIdentity) {
        throw new Error('Default bot identity is required');
    }
    if (!config.triggers || config.triggers.length === 0) {
        throw new Error('At least one trigger is required');
    }
    const responseRate = config.responseRate ?? config.defaultResponseRate ?? (0, botDefaults_1.getBotDefaults)().responseRate;
    const disabled = config.disabled ?? false;
    return {
        name: createBotReplyName(config.name),
        description: createBotDescription(config.description),
        defaultIdentity: config.defaultIdentity,
        triggers: config.triggers,
        defaultResponseRate: responseRate,
        skipBotMessages: config.skipBotMessages ?? true, // Default to true for safer behavior
        disabled,
    };
}
exports.validateBotConfig = validateBotConfig;
/**
 * Create a new reply bot with validated configuration
 */
function createReplyBot(config) {
    const validConfig = validateBotConfig(config);
    // Note: Database functionality disabled for now - using in-memory storage
    return {
        name: validConfig.name,
        description: validConfig.description,
        metadata: {
            responseRate: validConfig.defaultResponseRate,
            disabled: validConfig.disabled,
        },
        async processMessage(message) {
            // Check if bot is disabled first
            if (validConfig.disabled) {
                shared_1.logger.debug('Bot is disabled, skipping message');
                return;
            }
            // Check response rate next, before any other processing
            if (validConfig.defaultResponseRate <= 0) {
                shared_1.logger.debug('Skipping message due to response rate');
                return;
            }
            if (validConfig.defaultResponseRate < 100) {
                const randomValue = Math.random() * 100;
                if (randomValue >= validConfig.defaultResponseRate) {
                    shared_1.logger.debug('Skipping message due to response rate');
                    return;
                }
            }
            // Skip bot messages if configured
            if (validConfig.skipBotMessages && message.author.bot) {
                shared_1.logger.debug('Skipping bot message');
                return;
            }
            // Check blacklist (simple in-memory implementation)
            const guildId = message.guild?.id;
            const userId = message.author.id;
            if (guildId) {
                const blacklistKey = `blacklist:${guildId}:${userId}`;
                const blacklisted = getBotData(validConfig.name, blacklistKey);
                if (blacklisted) {
                    shared_1.logger.debug(`Skipping message from blacklisted user ${userId} in guild ${guildId}`);
                    return;
                }
            }
            // Sort and process triggers in priority order
            const sortedTriggers = [...validConfig.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
            // Process triggers in order
            shared_1.logger.debug(`[${validConfig.name}] Processing ${sortedTriggers.length} triggers for message: "${message.content}"`);
            for (const trigger of sortedTriggers) {
                try {
                    // Check if trigger matches
                    const matches = await trigger.condition(message);
                    shared_1.logger.debug(`[${validConfig.name}] Trigger "${trigger.name}" condition result: ${matches}`);
                    if (!matches)
                        continue;
                    // Get response
                    const responseText = await trigger.response(message);
                    if (!responseText) {
                        shared_1.logger.debug('Empty response from trigger');
                        continue;
                    }
                    // Get identity
                    let identity;
                    try {
                        identity =
                            typeof trigger.identity === 'function'
                                ? await trigger.identity(message)
                                : trigger.identity || validConfig.defaultIdentity;
                        if (!identity) {
                            throw new Error('Failed to retrieve valid bot identity');
                        }
                    }
                    catch (error) {
                        shared_1.logger.error('Failed to get bot identity', error);
                        continue;
                    }
                    // Send message with custom bot identity using webhooks
                    try {
                        if (message.channel instanceof discord_js_1.TextChannel) {
                            // Use webhook for custom bot identity
                            const webhook = await getOrCreateWebhook(message.channel, message.client);
                            await webhook.send({
                                content: responseText,
                                username: identity.botName,
                                avatarURL: identity.avatarUrl
                            });
                            shared_1.logger.debug(`Message sent via webhook as ${identity.botName}`);
                        }
                        else if ('send' in message.channel) {
                            // Fallback to regular message for non-text channels
                            await message.channel.send(responseText);
                            shared_1.logger.debug(`Message sent via regular channel (no webhook support)`);
                        }
                        else {
                            shared_1.logger.warn(`Channel does not support sending messages`);
                        }
                    }
                    catch (error) {
                        shared_1.logger.error(`Failed to send message to channel:`, error);
                        // Fallback to regular message if webhook fails
                        try {
                            if ('send' in message.channel) {
                                await message.channel.send(responseText);
                                shared_1.logger.debug(`Fallback message sent via regular channel`);
                            }
                        }
                        catch (fallbackError) {
                            shared_1.logger.error(`Fallback message also failed:`, fallbackError);
                        }
                    }
                    return;
                }
                catch (error) {
                    shared_1.logger.error('Error in trigger', error);
                }
            }
        },
    };
}
exports.createReplyBot = createReplyBot;
// Simple in-memory storage for bot data (replaces Prisma for now)
const botStorage = new Map();
function getBotData(botName, key) {
    const botKey = `${botName}:${key}`;
    return botStorage.get(botKey);
}
function setBotData(botName, key, value) {
    const botKey = `${botName}:${key}`;
    botStorage.set(botKey, value);
}
// Webhook cache for custom bot identities
const webhookCache = new Map();
async function getOrCreateWebhook(channel, client) {
    const cacheKey = channel.id;
    const cachedWebhook = webhookCache.get(cacheKey);
    if (cachedWebhook) {
        return cachedWebhook;
    }
    try {
        // Try to find existing webhook
        const webhooks = await channel.fetchWebhooks();
        const existingWebhook = webhooks.find(w => w.owner?.id === client.user?.id);
        if (existingWebhook) {
            webhookCache.set(cacheKey, existingWebhook);
            return existingWebhook;
        }
        // Create new webhook if none exists
        if (!client.user) {
            throw new Error('Client user not available');
        }
        const newWebhook = await channel.createWebhook({
            name: 'BunkBot Webhook',
            avatar: client.user.displayAvatarURL()
        });
        webhookCache.set(cacheKey, newWebhook);
        return newWebhook;
    }
    catch (error) {
        shared_1.logger.error(`Error in getOrCreateWebhook: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error(`Could not get or create webhook: ${error instanceof Error ? error.message : String(error)}`);
    }
}
