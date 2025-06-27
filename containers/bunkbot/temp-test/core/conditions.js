"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDefaultBotBehavior = exports.not = exports.or = exports.and = exports.contextLlmDetects = exports.llmDetects = exports.contextWithinTimeframeOf = exports.withinTimeframeOf = exports.contextFromBot = exports.fromBot = exports.withChance = exports.contextInChannel = exports.inChannel = exports.fromUser = exports.contextContainsPhrase = exports.containsPhrase = exports.contextContainsWord = exports.containsWord = exports.contextMatchesPattern = exports.matchesPattern = exports.createDuration = exports.createChannelId = exports.createUserId = void 0;
const shared_1 = require("@starbunk/shared");
// Simple user IDs for testing and development
const userIds = {
    Cova: '123456789' // Placeholder user ID
};
function createUserId(id) {
    if (!id || !/^\d{17,19}$/.test(id)) {
        throw new Error('Invalid user ID format');
    }
    return id;
}
exports.createUserId = createUserId;
function createChannelId(id) {
    if (!id || !/^\d{17,19}$/.test(id)) {
        throw new Error('Invalid channel ID format');
    }
    return id;
}
exports.createChannelId = createChannelId;
function createDuration(value) {
    if (value < 0) {
        throw new Error('Duration cannot be negative');
    }
    return value;
}
exports.createDuration = createDuration;
// Check if message matches regex pattern
const matchesPattern = (pattern) => (message) => pattern.test(message.content);
exports.matchesPattern = matchesPattern;
// Contextual version of matchesPattern
const contextMatchesPattern = (pattern) => (context) => pattern.test(context.content);
exports.contextMatchesPattern = contextMatchesPattern;
// Check if message contains a specific word (not substring)
const containsWord = (word) => {
    const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return (message) => wordRegex.test(message.content);
};
exports.containsWord = containsWord;
// Contextual version of containsWord
const contextContainsWord = (word) => (context) => context.hasWord(word);
exports.contextContainsWord = contextContainsWord;
// Check if message contains a phrase (substring)
function containsPhrase(phrase) {
    return (message) => message.content.toLowerCase().includes(phrase.toLowerCase());
}
exports.containsPhrase = containsPhrase;
// Contextual version of containsPhrase
function contextContainsPhrase(phrase) {
    return (context) => context.hasPhrase(phrase);
}
exports.contextContainsPhrase = contextContainsPhrase;
// Check if message is from specific user
function fromUser(userId) {
    if ((0, shared_1.isDebugMode)()) {
        return () => userId === userIds.Cova;
    }
    const id = typeof userId === 'string' ? createUserId(userId) : userId;
    return (message) => message.author.id === id;
}
exports.fromUser = fromUser;
// Check if message is in a specific channel
function inChannel(channelId) {
    const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
    return (message) => message.channel.id === id;
}
exports.inChannel = inChannel;
// Contextual version of inChannel
function contextInChannel(channelId) {
    const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
    return (context) => context.channel.id === id;
}
exports.contextInChannel = contextInChannel;
// Check based on random chance
function withChance(chance) {
    return () => {
        if ((0, shared_1.isDebugMode)()) {
            return true;
        }
        const random = Math.random() * 100;
        const result = random <= chance;
        shared_1.logger.debug(`withChance(${chance}): random=${random}, result=${result}`);
        return result;
    };
}
exports.withChance = withChance;
// Check if message is from a bot
function fromBot(includeSelf = true) {
    return (message) => {
        if (!message.author.bot)
            return false;
        // If we don't want to include self, check if it's the client
        if (!includeSelf && message.author.id === message.client.user?.id) {
            return false;
        }
        return true;
    };
}
exports.fromBot = fromBot;
// Contextual version of fromBot
function contextFromBot(includeSelf = true) {
    return (context) => {
        if (!context.isFromBot)
            return false;
        // If we don't want to include self, check if it's the client
        if (!includeSelf && context.author.id === context.message.client.user?.id) {
            return false;
        }
        return true;
    };
}
exports.contextFromBot = contextFromBot;
// Check if event happened within timeframe of a timestamp
function withinTimeframeOf(timestampFn, duration, unit) {
    const dur = typeof duration === 'number' ? createDuration(duration) : duration;
    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };
    const durationMs = dur * multipliers[unit];
    return () => {
        const now = Date.now();
        const timestamp = timestampFn();
        const result = now - timestamp <= durationMs;
        return result;
    };
}
exports.withinTimeframeOf = withinTimeframeOf;
// Contextual version of withinTimeframeOf
function contextWithinTimeframeOf(timestampFn, duration, unit) {
    const dur = typeof duration === 'number' ? createDuration(duration) : duration;
    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };
    const durationMs = dur * multipliers[unit];
    return () => {
        const now = Date.now();
        const timestamp = timestampFn();
        return now - timestamp <= durationMs;
    };
}
exports.contextWithinTimeframeOf = contextWithinTimeframeOf;
// Creates a condition using an LLM to analyze message content
function llmDetects(prompt) {
    return async (message) => {
        try {
            // TODO: Implement LLM service integration
            shared_1.logger.debug(`LLM detection requested for prompt: "${prompt}" on message: "${message.content}"`);
            // For now, return false to disable LLM-based conditions
            // This will be implemented when LLM service is properly integrated
            return false;
        }
        catch (error) {
            shared_1.logger.error(`LLM query failed in llmDetects: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };
}
exports.llmDetects = llmDetects;
// Contextual version of llmDetects
function contextLlmDetects(prompt) {
    const standardCondition = llmDetects(prompt);
    return async (context) => {
        return standardCondition(context.message);
    };
}
exports.contextLlmDetects = contextLlmDetects;
// Combine multiple conditions with AND logic
function and(...conditions) {
    return async (message) => {
        for (const condition of conditions) {
            const result = condition(message);
            const isMatch = result instanceof Promise ? await result : result;
            if (!isMatch) {
                return false;
            }
        }
        return true;
    };
}
exports.and = and;
// Combine multiple conditions with OR logic
function or(...conditions) {
    return async (message) => {
        for (const condition of conditions) {
            try {
                const result = condition(message);
                const isMatch = result instanceof Promise ? await result : result;
                if (isMatch) {
                    return true;
                }
            }
            catch (error) {
                shared_1.logger.debug(`Error in condition: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return false;
    };
}
exports.or = or;
// Negate a condition
function not(condition) {
    return async (message) => !(await condition(message));
}
exports.not = not;
// Helper to escape regex special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Wraps a condition with the default bot behavior:
 * - By default, ignores all bot messages
 * - Only processes bot messages if the condition explicitly includes fromBot()
 */
function withDefaultBotBehavior(botName, condition) {
    return async (message) => {
        try {
            // Skip bot messages if configured
            if (message.author.bot) {
                shared_1.logger.debug(`[${botName}] Skipping message from bot user`);
                return false;
            }
            // Check the condition
            const result = await condition(message);
            // Log the result
            if (result) {
                shared_1.logger.debug(`[${botName}] Condition matched`);
            }
            else {
                shared_1.logger.debug(`[${botName}] Condition did not match`);
            }
            return result;
        }
        catch (error) {
            shared_1.logger.error(`[${botName}] Error in condition:`, error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    };
}
exports.withDefaultBotBehavior = withDefaultBotBehavior;
