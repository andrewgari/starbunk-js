"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPromptDefaultOptions = exports.formatPromptMessages = exports.PromptRegistry = exports.PromptType = void 0;
/**
 * Type of prompts available in the system
 */
var PromptType;
(function (PromptType) {
    PromptType["BLUE_DETECTOR"] = "blueDetector";
    PromptType["BLUE_ACKNOWLEDGMENT"] = "blueAcknowledgment";
    PromptType["BLUE_SENTIMENT"] = "blueSentiment";
    PromptType["COVA_EMULATOR"] = "covaEmulator";
})(PromptType || (exports.PromptType = PromptType = {}));
/**
 * Registry of available prompts
 */
var PromptRegistry = /** @class */ (function () {
    function PromptRegistry() {
    }
    /**
     * Register a prompt
     * @param type Prompt type
     * @param prompt Prompt definition
     */
    PromptRegistry.registerPrompt = function (type, prompt) {
        this.prompts.set(type, prompt);
    };
    /**
     * Get a prompt by type
     * @param type Prompt type
     */
    PromptRegistry.getPrompt = function (type) {
        return this.prompts.get(type);
    };
    /**
     * Check if a prompt is registered
     * @param type Prompt type
     */
    PromptRegistry.hasPrompt = function (type) {
        return this.prompts.has(type);
    };
    /**
     * Get all registered prompt types
     */
    PromptRegistry.getPromptTypes = function () {
        return Array.from(this.prompts.keys());
    };
    PromptRegistry.prompts = new Map();
    return PromptRegistry;
}());
exports.PromptRegistry = PromptRegistry;
/**
 * Format messages for a prompt
 * @param promptType Prompt type
 * @param userMessage User message
 */
function formatPromptMessages(promptType, userMessage) {
    var prompt = PromptRegistry.getPrompt(promptType);
    if (!prompt) {
        throw new Error("Prompt type ".concat(promptType, " not registered"));
    }
    return [
        {
            role: 'system',
            content: prompt.systemContent
        },
        {
            role: 'user',
            content: prompt.formatUserMessage(userMessage)
        }
    ];
}
exports.formatPromptMessages = formatPromptMessages;
/**
 * Get default completion options for a prompt
 * @param promptType Prompt type
 */
function getPromptDefaultOptions(promptType) {
    var prompt = PromptRegistry.getPrompt(promptType);
    if (!prompt) {
        throw new Error("Prompt type ".concat(promptType, " not registered"));
    }
    return {
        temperature: prompt.defaultTemperature,
        maxTokens: prompt.defaultMaxTokens
    };
}
exports.getPromptDefaultOptions = getPromptDefaultOptions;
