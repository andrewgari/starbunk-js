"use strict";
/**
 * Represents a bot's identity with strong type guarantees
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBotIdentity = exports.createAvatarUrl = exports.createBotName = void 0;
// Factory function to create a valid BotName with validation
function createBotName(name) {
    if (!name || name.length < 2 || name.length > 32) {
        throw new Error('Bot name must be between 2 and 32 characters');
    }
    return name;
}
exports.createBotName = createBotName;
// Factory function to create a valid AvatarUrl with validation
function createAvatarUrl(url) {
    if (!url || !url.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)$/i)) {
        throw new Error('Avatar URL must be a valid image URL (http/https with image extension)');
    }
    return url;
}
exports.createAvatarUrl = createAvatarUrl;
// Factory function to create a valid BotIdentity
function createBotIdentity(name, avatarUrl) {
    return {
        botName: createBotName(name),
        avatarUrl: createAvatarUrl(avatarUrl)
    };
}
exports.createBotIdentity = createBotIdentity;
