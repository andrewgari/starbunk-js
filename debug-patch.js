// Debug patch to add enhanced logging to BunkBot message handling
// This script will be injected into the running container

const originalConsole = console.log;

// Enhanced logging function
function debugLog(message, ...args) {
    const timestamp = new Date().toISOString();
    originalConsole(`🐛 [${timestamp}] DEBUG: ${message}`, ...args);
}

// Patch the Discord client to add debug logging
function patchDiscordClient() {
    debugLog('🔧 Applying debug patches to Discord client...');
    
    // Try to find the Discord client in the global scope or require cache
    const discordModule = require('discord.js');
    const originalClient = discordModule.Client;
    
    // Patch the Client constructor to add debug logging
    discordModule.Client = class extends originalClient {
        constructor(options) {
            super(options);
            debugLog('📱 Discord Client created with options:', JSON.stringify(options, null, 2));
            
            // Patch the emit method to log all events
            const originalEmit = this.emit;
            this.emit = function(event, ...args) {
                if (event === 'messageCreate') {
                    debugLog(`🔔 Event: ${event}`);
                    if (args[0]) {
                        const message = args[0];
                        debugLog(`   Author: ${message.author?.username || 'unknown'} (Bot: ${message.author?.bot || false})`);
                        debugLog(`   Content: "${message.content || 'no content'}"`);
                        debugLog(`   Channel: ${message.channel?.id || 'unknown'}`);
                        debugLog(`   Guild: ${message.guild?.id || 'DM'}`);
                    }
                } else if (event === 'ready') {
                    debugLog(`🔔 Event: ${event}`);
                    debugLog(`   Bot user: ${this.user?.tag}`);
                    debugLog(`   Guild count: ${this.guilds.cache.size}`);
                } else if (['error', 'warn', 'debug'].includes(event)) {
                    debugLog(`🔔 Event: ${event}`, args[0]);
                }
                
                return originalEmit.apply(this, [event, ...args]);
            };
        }
    };
    
    debugLog('✅ Discord client patched successfully');
}

// Apply the patch
try {
    patchDiscordClient();
    debugLog('🎉 Debug patches applied successfully');
} catch (error) {
    debugLog('❌ Failed to apply debug patches:', error);
}

// Export for potential use
module.exports = { debugLog, patchDiscordClient };
