// Patch script to add debug logging to BunkBot message handling
// This will be injected into the running container

console.log('🔧 Applying BunkBot debug patches...');

// Override console.log to add timestamps
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function debugLog(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `🐛 [${timestamp}] [${level}]`;
    originalLog(prefix, ...args);
}

console.log = (...args) => debugLog('DEBUG', ...args);
console.error = (...args) => debugLog('ERROR', ...args);
console.warn = (...args) => debugLog('WARN', ...args);

// Patch Discord.js Client to add event logging
try {
    const discord = require('discord.js');
    const originalEmit = discord.Client.prototype.emit;
    
    discord.Client.prototype.emit = function(event, ...args) {
        if (event === 'messageCreate') {
            const message = args[0];
            debugLog('EVENT', `📨 MessageCreate event received:`);
            debugLog('EVENT', `   Author: ${message.author?.username || 'unknown'} (Bot: ${message.author?.bot || false})`);
            debugLog('EVENT', `   Content: "${message.content || 'no content'}"`);
            debugLog('EVENT', `   Channel: ${message.channel?.name || 'unknown'} (${message.channel?.id || 'unknown'})`);
            debugLog('EVENT', `   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'N/A'})`);
            
            // Check if this should trigger BunkBot
            if (message.content && message.content.toLowerCase().includes('hello bunkbot')) {
                debugLog('TRIGGER', `🎯 "hello bunkbot" trigger detected in message!`);
            }
        } else if (event === 'ready') {
            debugLog('EVENT', `🤖 Discord client ready event`);
        } else if (event === 'error') {
            debugLog('EVENT', `❌ Discord client error event:`, args[0]);
        }
        
        return originalEmit.apply(this, [event, ...args]);
    };
    
    debugLog('PATCH', '✅ Discord.js Client patched for event logging');
} catch (error) {
    debugLog('PATCH', '❌ Failed to patch Discord.js Client:', error);
}

// Patch WebhookManager if available
try {
    // Try to find and patch the WebhookManager
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
        const result = originalRequire.apply(this, arguments);
        
        // If this is the shared module, patch the WebhookManager
        if (id.includes('@starbunk/shared') || id.includes('webhookManager')) {
            if (result.WebhookManager) {
                const originalSendMessage = result.WebhookManager.prototype.sendMessage;
                
                result.WebhookManager.prototype.sendMessage = async function(channelId, message) {
                    debugLog('WEBHOOK', `📤 WebhookManager.sendMessage called:`);
                    debugLog('WEBHOOK', `   Channel ID: ${channelId}`);
                    debugLog('WEBHOOK', `   Message: ${JSON.stringify(message)}`);
                    
                    try {
                        const result = await originalSendMessage.call(this, channelId, message);
                        debugLog('WEBHOOK', `✅ Webhook message sent successfully`);
                        return result;
                    } catch (error) {
                        debugLog('WEBHOOK', `❌ Webhook message failed:`, error);
                        throw error;
                    }
                };
                
                debugLog('PATCH', '✅ WebhookManager patched for debug logging');
            }
        }
        
        return result;
    };
    
} catch (error) {
    debugLog('PATCH', '❌ Failed to patch WebhookManager:', error);
}

debugLog('PATCH', '🎉 All debug patches applied successfully');

// Export for potential use
module.exports = { debugLog };
