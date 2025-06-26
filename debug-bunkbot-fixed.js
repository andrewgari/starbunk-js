#!/usr/bin/env node

// Enhanced Debug BunkBot - Direct JavaScript implementation to isolate the issue
const { Client, GatewayIntentBits, Events, IntentsBitField } = require('discord.js');
require('dotenv').config();

console.log('🚀 Starting Enhanced Debug BunkBot...');
console.log('Environment check:');
console.log('- STARBUNK_TOKEN:', process.env.STARBUNK_TOKEN ? 'Set' : 'Missing');
console.log('- DEBUG:', process.env.DEBUG);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Replicate the exact BunkBot client configuration
const BunkBotConfig = {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    enableWebhooks: true,
};

function createDiscordClient(config) {
    console.log('🔧 Creating Discord client with config:', JSON.stringify(config, null, 2));
    
    const intents = new IntentsBitField();
    
    // Add required intents
    for (const intent of config.intents) {
        intents.add(intent);
        console.log(`   Added intent: ${intent}`);
    }
    
    // Add webhook intents if needed
    if (config.enableWebhooks) {
        intents.add(GatewayIntentBits.GuildWebhooks);
        console.log('   Added webhook intent');
    }

    const client = new Client({ intents });
    
    console.log('✅ Discord client created');
    console.log('   Intents bitfield:', client.options.intents.bitfield);
    console.log('   Intents array:', client.options.intents.toArray());

    return client;
}

// Create the Discord client
const client = createDiscordClient(BunkBotConfig);

let messageCount = 0;
let isReady = false;

// Enhanced event handlers with comprehensive logging
client.on(Events.Error, (error) => {
    console.log('❌ Discord client error:', error);
});

client.on(Events.Warn, (warning) => {
    console.log('⚠️  Discord client warning:', warning);
});

client.on(Events.MessageCreate, async (message) => {
    messageCount++;
    
    console.log(`\n📨 MessageCreate Event #${messageCount} [${new Date().toISOString()}]:`);
    console.log(`   Author: ${message.author.username} (ID: ${message.author.id}, Bot: ${message.author.bot})`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Channel: ${message.channel.name || 'DM'} (ID: ${message.channel.id})`);
    console.log(`   Guild: ${message.guild?.name || 'DM'} (ID: ${message.guild?.id || 'N/A'})`);
    
    // Call handleMessage function
    await handleMessage(message);
});

client.on(Events.InteractionCreate, async (interaction) => {
    console.log('🎮 InteractionCreate event received');
    console.log(`   Type: ${interaction.type}`);
    console.log(`   User: ${interaction.user?.username || 'unknown'}`);
});

client.once(Events.ClientReady, () => {
    isReady = true;
    console.log(`\n🤖 Enhanced Debug BunkBot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds:`);
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log('\n🔍 Monitoring for messages containing "hello bunkbot"...');
    console.log('💡 This version has enhanced debug logging to identify the issue');
    
    // Send a test message after 10 seconds to verify event reception
    setTimeout(async () => {
        try {
            const guild = client.guilds.cache.get('753251582719688714');
            if (guild) {
                const testChannel = guild.channels.cache.find(ch => 
                    ch.name === 'bot-testing' && ch.isTextBased()
                );
                
                if (testChannel) {
                    console.log('\n🧪 Sending self-test message...');
                    await testChannel.send('hello bunkbot - enhanced debug test');
                    console.log('✅ Self-test message sent');
                }
            }
        } catch (error) {
            console.log('❌ Failed to send self-test message:', error.message);
        }
    }, 10000);
});

// Enhanced handleMessage function with detailed logging
async function handleMessage(message) {
    console.log('   🔄 Entering handleMessage function...');
    
    // Skip bot messages
    if (message.author.bot) {
        console.log('   ⏭️  Skipping bot message (author.bot = true)');
        return;
    }
    
    console.log('   ✅ Message is from a human user, processing...');
    
    try {
        console.log('   🔍 Checking for "hello bunkbot" trigger...');
        console.log(`   Content to check: "${message.content}"`);
        console.log(`   Lowercase content: "${message.content.toLowerCase()}"`);
        console.log(`   Contains "hello bunkbot": ${message.content.toLowerCase().includes('hello bunkbot')}`);
        
        // Check for trigger
        if (message.content.toLowerCase().includes('hello bunkbot')) {
            console.log('   🎯 TRIGGER DETECTED! Preparing response...');
            
            const responseText = `Hello ${message.author.username}! Enhanced Debug BunkBot is working! 🤖`;
            console.log(`   📝 Response text: "${responseText}"`);
            
            try {
                // Use simple message reply instead of webhooks for debugging
                console.log('   📤 Sending reply...');
                await message.reply(responseText);
                console.log('   ✅ Reply sent successfully!');
            } catch (replyError) {
                console.log('   ❌ Reply failed, trying channel.send...', replyError.message);
                
                try {
                    await message.channel.send(responseText);
                    console.log('   ✅ Channel.send successful!');
                } catch (sendError) {
                    console.log('   ❌ Channel.send also failed:', sendError.message);
                }
            }
        } else {
            console.log('   ❌ No trigger found in message');
        }
    } catch (error) {
        console.log('   ❌ Error in handleMessage:', error);
    }
    
    console.log('   🔄 Exiting handleMessage function');
}

// Login with enhanced error handling
console.log('\n🔐 Logging in to Discord...');
client.login(process.env.STARBUNK_TOKEN).then(() => {
    console.log('✅ Login successful');
}).catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Enhanced Debug BunkBot...');
    console.log(`📊 Final statistics:`);
    console.log(`   Messages processed: ${messageCount}`);
    console.log(`   Ready state: ${isReady}`);
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    client.destroy();
    process.exit(0);
});

// Heartbeat logging
setInterval(() => {
    if (isReady) {
        console.log(`💓 Heartbeat: Ready, ${messageCount} messages processed`);
    }
}, 60000);
