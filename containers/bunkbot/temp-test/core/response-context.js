"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asResponseGenerator = exports.asCondition = exports.createResponseContext = void 0;
/**
 * Create a response context from a Discord message
 */
function createResponseContext(message) {
    const content = message.content;
    const parts = content.split(/\s+/);
    const mentioned = new Set();
    const mentionedRoles = new Set();
    // Extract mentioned users
    message.mentions.users.forEach(user => {
        mentioned.add(user.id);
    });
    // Extract mentioned roles
    message.mentions.roles.forEach(role => {
        mentionedRoles.add(role.id);
    });
    return {
        message,
        content,
        author: message.author,
        channel: message.channel,
        guild: message.guild,
        timestamp: new Date(message.createdTimestamp),
        isFromBot: message.author.bot,
        isDM: message.channel.type === 1, // DM channel type is 1
        mentioned,
        mentionedRoles,
        parts,
        // Helper methods
        hasWord(word) {
            const wordPattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
            return wordPattern.test(content);
        },
        hasPhrase(phrase) {
            return content.toLowerCase().includes(phrase.toLowerCase());
        },
        matchesRegex(pattern) {
            return pattern.test(content);
        },
        getMentionedUsers() {
            return Array.from(message.mentions.users.values());
        }
    };
}
exports.createResponseContext = createResponseContext;
// Helper function to escape regex special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Convert a ContextualTriggerCondition to a standard TriggerCondition
 */
function asCondition(condition) {
    return async (message) => {
        const context = createResponseContext(message);
        return condition(context);
    };
}
exports.asCondition = asCondition;
/**
 * Convert a ContextualResponseGenerator to a standard ResponseGenerator
 */
function asResponseGenerator(generator) {
    return async (message) => {
        const context = createResponseContext(message);
        return generator(context);
    };
}
exports.asResponseGenerator = asResponseGenerator;
