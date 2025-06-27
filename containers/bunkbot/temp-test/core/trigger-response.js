"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTriggerResponse = exports.TriggerResponseClass = exports.createPriority = exports.createTriggerName = void 0;
const shared_1 = require("@starbunk/shared");
const shared_2 = require("@starbunk/shared");
const conditions_1 = require("./conditions");
function createTriggerName(name) {
    if (!name || name.trim().length === 0) {
        throw new Error('Trigger name cannot be empty');
    }
    return name;
}
exports.createTriggerName = createTriggerName;
function createPriority(value) {
    if (value < 0) {
        throw new Error('Priority must be a non-negative number');
    }
    return value;
}
exports.createPriority = createPriority;
// Class representing a single trigger-response pair
class TriggerResponseClass {
    constructor(config) {
        this.name = createTriggerName(config.name);
        this.botName = config.botName;
        // Wrap the condition with default bot behavior
        this.condition = (0, conditions_1.withDefaultBotBehavior)(this.botName, config.condition);
        this.response = config.response;
        this.identity = config.identity;
        this.priority = createPriority(config.priority || 0);
    }
    // Check if this trigger matches the message
    async matches(message) {
        try {
            return this.condition(message);
        }
        catch (error) {
            shared_2.logger.error('Error in condition evaluation', error);
            return false;
        }
    }
    // Get the identity to use for this response
    async getIdentity(message, defaultIdentity) {
        if (!this.identity) {
            return defaultIdentity;
        }
        try {
            if (typeof this.identity === 'function') {
                const result = await this.identity(message);
                return result;
            }
            return this.identity;
        }
        catch (error) {
            shared_2.logger.error(`[TriggerResponse:${this.name}] Error getting identity:`, error);
            return defaultIdentity;
        }
    }
    // Process the message and send a response if conditions match
    async process(message, defaultIdentity, botName) {
        try {
            const matches = await this.matches(message);
            if (!matches) {
                return false;
            }
            shared_2.logger.debug(`[${botName}] Trigger "${this.name}" matched`);
            // Get identity for this response
            const identity = await this.getIdentity(message, defaultIdentity);
            // Generate and send response
            const responseText = await this.response(message);
            const channel = message.channel;
            shared_2.logger.debug(`[${botName}] Sending response: "${responseText.substring(0, 100)}..."`);
            // Use the discord service to send the message
            // Use pre-imported DiscordService for better performance
            await (0, shared_1.getDiscordService)().sendMessageWithBotIdentity(channel.id, identity, responseText);
            return true;
        }
        catch (error) {
            shared_2.logger.error(`[TriggerResponse:${this.name}] Error processing:`, error);
            throw error;
        }
    }
}
exports.TriggerResponseClass = TriggerResponseClass;
// Factory function to create a trigger-response pair with validation
function createTriggerResponse(config) {
    return {
        name: createTriggerName(config.name),
        condition: config.condition,
        response: config.response,
        identity: config.identity,
        priority: config.priority !== undefined ? createPriority(config.priority) : createPriority(0),
        botName: config.botName,
    };
}
exports.createTriggerResponse = createTriggerResponse;
