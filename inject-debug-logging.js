// Runtime debug injection for BunkBot container
// This will patch the running BunkBot to add debug logging

console.log('🔧 Injecting debug logging into BunkBot...');

// Get the current timestamp for logging
function debugTimestamp() {
    return new Date().toISOString();
}

// Enhanced logging function
function debugLog(level, message, ...args) {
    console.log(`🐛 [${debugTimestamp()}] [${level}] ${message}`, ...args);
}

// Try to patch the Discord.js Events
try {
    const discord = require('discord.js');
    
    // Override the Events.MessageCreate handler globally
    const originalEmit = process.emit;
    process.emit = function(event, ...args) {
        if (event === 'uncaughtException' || event === 'unhandledRejection') {
            debugLog('ERROR', `Process event: ${event}`, args[0]);
        }
        return originalEmit.apply(this, [event, ...args]);
    };
    
    debugLog('PATCH', 'Process event handlers patched');
} catch (error) {
    debugLog('ERROR', 'Failed to patch process events:', error);
}

// Patch console methods to add debug info
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function(...args) {
    originalConsoleLog(`🐛 [${debugTimestamp()}] [LOG]`, ...args);
};

console.error = function(...args) {
    originalConsoleError(`🐛 [${debugTimestamp()}] [ERROR]`, ...args);
};

console.warn = function(...args) {
    originalConsoleWarn(`🐛 [${debugTimestamp()}] [WARN]`, ...args);
};

// Try to find and patch the BunkBot instance
setTimeout(() => {
    debugLog('PATCH', 'Looking for BunkBot instance to patch...');
    
    // Try to access global objects that might contain the client
    if (global.client) {
        debugLog('PATCH', 'Found global.client, patching...');
        patchDiscordClient(global.client);
    }
    
    // Try to find the client in the module cache
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
        const result = originalRequire.apply(this, arguments);
        
        // If this is discord.js, patch the Client class
        if (id === 'discord.js' && result.Client) {
            debugLog('PATCH', 'Patching discord.js Client class...');
            
            const originalEmit = result.Client.prototype.emit;
            result.Client.prototype.emit = function(event, ...args) {
                if (event === 'messageCreate') {
                    const message = args[0];
                    debugLog('EVENT', `📨 MessageCreate event intercepted:`);
                    debugLog('EVENT', `   Author: ${message.author?.username || 'unknown'} (Bot: ${message.author?.bot || false})`);
                    debugLog('EVENT', `   Content: "${message.content || 'no content'}"`);
                    debugLog('EVENT', `   Channel: ${message.channel?.name || 'unknown'} (${message.channel?.id || 'unknown'})`);
                    debugLog('EVENT', `   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'N/A'})`);
                    
                    if (message.content && message.content.toLowerCase().includes('hello bunkbot')) {
                        debugLog('TRIGGER', '🎯 "hello bunkbot" trigger detected in intercepted event!');
                    }
                } else if (event === 'ready') {
                    debugLog('EVENT', '🤖 Discord client ready event intercepted');
                }
                
                return originalEmit.apply(this, [event, ...args]);
            };
        }
        
        return result;
    };
    
    debugLog('PATCH', 'Module require patched for discord.js interception');
}, 1000);

function patchDiscordClient(client) {
    if (!client || typeof client.emit !== 'function') {
        debugLog('ERROR', 'Invalid client object for patching');
        return;
    }
    
    const originalEmit = client.emit;
    client.emit = function(event, ...args) {
        if (event === 'messageCreate') {
            const message = args[0];
            debugLog('CLIENT', `📨 Client messageCreate event:`);
            debugLog('CLIENT', `   Author: ${message.author?.username || 'unknown'} (Bot: ${message.author?.bot || false})`);
            debugLog('CLIENT', `   Content: "${message.content || 'no content'}"`);
            debugLog('CLIENT', `   Channel: ${message.channel?.name || 'unknown'} (${message.channel?.id || 'unknown'})`);
            debugLog('CLIENT', `   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'N/A'})`);
        }
        
        return originalEmit.apply(this, [event, ...args]);
    };
    
    debugLog('PATCH', 'Discord client emit method patched');
}

debugLog('INIT', '🎉 Debug injection completed');

// Keep the script running
setInterval(() => {
    debugLog('HEARTBEAT', 'Debug injection still active');
}, 30000);

module.exports = { debugLog, patchDiscordClient };
