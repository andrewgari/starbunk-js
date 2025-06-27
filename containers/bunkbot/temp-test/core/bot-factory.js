"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotFactory = void 0;
const bot_builder_1 = require("./bot-builder");
/**
 * Factory class for creating bots
 */
class BotFactory {
    /**
     * Create a reply bot
     * @param config Bot configuration
     * @returns A reply bot
     */
    static createBot(config) {
        return (0, bot_builder_1.createReplyBot)(config);
    }
}
exports.BotFactory = BotFactory;
