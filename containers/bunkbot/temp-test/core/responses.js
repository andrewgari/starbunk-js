"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertContextualResponses = exports.sendContextBotResponse = exports.sendBotResponse = exports.contextRegexCaptureResponse = exports.regexCaptureResponse = exports.contextTemplateResponse = exports.templateResponse = exports.contextRandomResponse = exports.weightedRandomResponse = exports.randomResponse = exports.contextStaticResponse = exports.staticResponse = exports.createStaticMessage = void 0;
const shared_1 = require("@starbunk/shared");
const shared_2 = require("@starbunk/shared");
const response_context_1 = require("./response-context");
function createStaticMessage(text) {
    if (!text || text.trim().length === 0) {
        throw new Error('Static message cannot be empty');
    }
    return text;
}
exports.createStaticMessage = createStaticMessage;
// Creates a static text response
function staticResponse(text) {
    const staticText = typeof text === 'string' ? createStaticMessage(text) : text;
    return () => staticText.toString();
}
exports.staticResponse = staticResponse;
// Contextual version of staticResponse
function contextStaticResponse(text) {
    const staticText = typeof text === 'string' ? createStaticMessage(text) : text;
    return () => staticText.toString();
}
exports.contextStaticResponse = contextStaticResponse;
// Keep track of last responses to avoid repetition
const lastResponses = new Map();
function randomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)].toString();
}
exports.randomResponse = randomResponse;
// Creates a random response from an array of options
function weightedRandomResponse(options, config = {}) {
    if (!options || options.length === 0) {
        throw new Error('Random response options array cannot be empty');
    }
    // Validate weights if provided
    if (config.weights && config.weights.length !== options.length) {
        throw new Error('Weights array length must match options array length');
    }
    // Convert all string options to StaticMessage
    const validatedOptions = options.map(opt => typeof opt === 'string' ? createStaticMessage(opt) : opt);
    // Create a unique ID for this response set based on content
    const responseSetId = validatedOptions.map(o => o.toString()).join('|');
    return (message) => {
        // Get the key for this message context
        const contextKey = `${responseSetId}:${message.channel.id}`;
        // Get the last response for this context
        const lastResponse = lastResponses.get(contextKey);
        // Choose a response, avoiding repetition if configured
        let response;
        let attempts = 0;
        const maxAttempts = validatedOptions.length * 2;
        do {
            // Select a response based on weights or randomly
            let index;
            if (config.weights) {
                // Weighted selection
                const totalWeight = config.weights.reduce((sum, w) => sum + w, 0);
                let rand = Math.random() * totalWeight;
                index = 0;
                while (index < config.weights.length - 1) {
                    rand -= config.weights[index];
                    if (rand <= 0)
                        break;
                    index++;
                }
            }
            else {
                // Uniform random selection
                index = Math.floor(Math.random() * validatedOptions.length);
            }
            response = validatedOptions[index].toString();
            attempts++;
        } while (!config.allowRepetition &&
            response === lastResponse &&
            attempts < maxAttempts &&
            validatedOptions.length > 1);
        // Remember this response to avoid repetition next time
        lastResponses.set(contextKey, response);
        // Limit the cache size
        if (lastResponses.size > 1000) {
            // Remove the oldest entries
            const keys = Array.from(lastResponses.keys());
            for (let i = 0; i < 200; i++) {
                lastResponses.delete(keys[i]);
            }
        }
        return response;
    };
}
exports.weightedRandomResponse = weightedRandomResponse;
// Contextual version of randomResponse
function contextRandomResponse(options, config = {}) {
    const standardGenerator = weightedRandomResponse(options, config);
    return (context) => standardGenerator(context.message);
}
exports.contextRandomResponse = contextRandomResponse;
// Creates a template response with variable substitution
function templateResponse(template, variablesFn) {
    if (!template || template.trim().length === 0) {
        throw new Error('Template string cannot be empty');
    }
    return (message) => {
        try {
            const variables = variablesFn(message);
            let response = template;
            // Replace variables in template
            for (const [key, value] of Object.entries(variables)) {
                response = response.replace(new RegExp(`{${key}}`, 'g'), value);
            }
            return response;
        }
        catch (error) {
            shared_2.logger.error(`Error generating template response:`, error);
            return template; // Return raw template as fallback
        }
    };
}
exports.templateResponse = templateResponse;
// Contextual version of templateResponse
function contextTemplateResponse(template, variablesFn) {
    if (!template || template.trim().length === 0) {
        throw new Error('Template string cannot be empty');
    }
    return (context) => {
        try {
            const variables = variablesFn(context);
            let response = template;
            // Replace variables in template
            for (const [key, value] of Object.entries(variables)) {
                response = response.replace(new RegExp(`{${key}}`, 'g'), value);
            }
            return response;
        }
        catch (error) {
            shared_2.logger.error(`Error generating contextual template response:`, error);
            return template; // Return raw template as fallback
        }
    };
}
exports.contextTemplateResponse = contextTemplateResponse;
// Processes a message using regex group captures
function regexCaptureResponse(pattern, template) {
    if (!template || template.trim().length === 0) {
        throw new Error('Template string cannot be empty');
    }
    return (message) => {
        try {
            const match = message.content.match(pattern);
            if (!match)
                return template;
            // Replace $1, $2, etc. with captured groups
            return template.replace(/\$(\d+)/g, (_, index) => {
                const groupNum = parseInt(index);
                return match[groupNum] || '';
            });
        }
        catch (error) {
            shared_2.logger.error(`Error generating regex capture response:`, error);
            return template; // Return raw template as fallback
        }
    };
}
exports.regexCaptureResponse = regexCaptureResponse;
// Contextual version of regexCaptureResponse
function contextRegexCaptureResponse(pattern, template) {
    if (!template || template.trim().length === 0) {
        throw new Error('Template string cannot be empty');
    }
    return (context) => {
        try {
            const match = context.content.match(pattern);
            if (!match)
                return template;
            // Replace $1, $2, etc. with captured groups
            return template.replace(/\$(\d+)/g, (_, index) => {
                const groupNum = parseInt(index);
                return match[groupNum] || '';
            });
        }
        catch (error) {
            shared_2.logger.error(`Error generating contextual regex capture response:`, error);
            return template; // Return raw template as fallback
        }
    };
}
exports.contextRegexCaptureResponse = contextRegexCaptureResponse;
// Helper function to send a response with a specific bot identity
async function sendBotResponse(message, identity, responseGenerator, botName) {
    try {
        const channel = message.channel;
        const responseText = await responseGenerator(message);
        if (!responseText || responseText.trim().length === 0) {
            shared_2.logger.warn(`[${botName}] Empty response generated, not sending`);
            return;
        }
        shared_2.logger.debug(`[${botName}] Sending response: "${responseText.substring(0, 100)}..."`);
        await (0, shared_1.getDiscordService)().sendMessageWithBotIdentity(channel.id, identity, responseText);
        shared_2.logger.debug(`[${botName}] Response sent successfully`);
    }
    catch (error) {
        shared_2.logger.error(`[${botName}] Error sending response:`, error);
        throw error;
    }
}
exports.sendBotResponse = sendBotResponse;
// Contextual version of sendBotResponse
async function sendContextBotResponse(context, identity, responseGenerator, botName) {
    try {
        const channel = context.channel;
        const responseText = await responseGenerator(context);
        if (!responseText || responseText.trim().length === 0) {
            shared_2.logger.warn(`[${botName}] Empty response generated from context, not sending`);
            return;
        }
        shared_2.logger.debug(`[${botName}] Sending contextual response: "${responseText.substring(0, 100)}..."`);
        await (0, shared_1.getDiscordService)().sendMessageWithBotIdentity(channel.id, identity, responseText);
        shared_2.logger.debug(`[${botName}] Contextual response sent successfully`);
    }
    catch (error) {
        shared_2.logger.error(`[${botName}] Error sending contextual response:`, error);
        throw error;
    }
}
exports.sendContextBotResponse = sendContextBotResponse;
// Convert contextual response generators to standard response generators
function convertContextualResponses(generators) {
    return generators.map(generator => (0, response_context_1.asResponseGenerator)(generator));
}
exports.convertContextualResponses = convertContextualResponses;
