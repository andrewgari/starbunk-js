#!/usr/bin/env node

// Test using the exact same client factory as BunkBot to isolate the issue
const { Events } = require('discord.js');
require('dotenv').config();

// Import the shared library functions (simulated)
const { Client, GatewayIntentBits, IntentsBitField } = require('discord.js');

// Replicate the createDiscordClient function from containers/shared/src/discord/clientFactory.ts
function createDiscordClient(config) {
    const intents = new IntentsBitField();
    
    // Add required intents
    for (const intent of config.intents) {
        intents.add(intent);
    }
    
    // Add voice intents if needed
    if (config.enableVoice) {
        intents.add(GatewayIntentBits.GuildVoiceStates);
    }
    
    // Add webhook intents if needed
    if (config.enableWebhooks) {
        intents.add(GatewayIntentBits.GuildWebhooks);
    }

    const client = new Client({ intents });

    // Set up basic error handling (from clientFactory)
    client.on('error', (error) => {
        console.log('Discord client error:', error);
    });

    client.on('warn', (warning) => {
        console.log('Discord client warning:', warning);
    });

    return client;
}

// Replicate the BunkBot ClientConfig
const BunkBotConfig = {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    enableWebhooks: true,
};

console.log('🧪 Testing BunkBot client factory configuration...');
console.log('Configuration:', JSON.stringify(BunkBotConfig, null, 2));

// Create client using the same factory as BunkBot
const client = createDiscordClient(BunkBotConfig);

console.log('✅ Discord client created');
console.log('Intents bitfield:', client.options.intents.bitfield);
console.log('Intents array:', client.options.intents.toArray());

let messageCount = 0;

// Set up the same event handlers as BunkBot
client.on(Events.Error, (error) => {
    console.log('❌ Discord client error:', error);
});

client.on(Events.Warn, (warning) => {
    console.log('⚠️  Discord client warning:', warning);
});

client.on(Events.MessageCreate, async (message) => {
    messageCount++;
    console.log(`\n📨 MessageCreate Event #${messageCount}:`);
    console.log(`   Author: ${message.author.username} (Bot: ${message.author.bot})`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Channel: ${message.channel.name || 'DM'} (${message.channel.id})`);
    console.log(`   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'N/A'})`);
    
    // Skip bot messages (same as BunkBot)
    if (message.author.bot) {
        console.log('   ⏭️  Skipping bot message');
        return;
    }
    
    // Check for trigger (same as BunkBot)
    if (message.content.toLowerCase().includes('hello bunkbot')) {
        console.log('   🎯 TRIGGER DETECTED! This would trigger BunkBot response');
        
        // Instead of webhook, use regular reply for testing
        try {
            await message.reply('✅ BunkBot client factory test successful! The client CAN receive messages.');
            console.log('   ✅ Test response sent successfully');
        } catch (error) {
            console.log('   ❌ Failed to send test response:', error.message);
        }
    } else {
        console.log('   ❌ No trigger found');
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    console.log('🎮 InteractionCreate event received');
});

client.once(Events.ClientReady, () => {
    console.log(`🤖 Client ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds`);
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log('\n🔍 Monitoring for messages containing "hello bunkbot"...');
    console.log('💡 This test uses the EXACT same client factory as BunkBot');
    
    // Send a test message after 5 seconds
    setTimeout(async () => {
        try {
            const guild = client.guilds.cache.get('753251582719688714');
            if (guild) {
                const testChannel = guild.channels.cache.find(ch => 
                    ch.name === 'bot-testing' && ch.isTextBased()
                );
                
                if (testChannel) {
                    console.log('\n🧪 Sending test message to trigger event...');
                    await testChannel.send('hello bunkbot - client factory test');
                    console.log('✅ Test message sent');
                }
            }
        } catch (error) {
            console.log('❌ Failed to send test message:', error.message);
        }
    }, 5000);
});

// Login
console.log('🔐 Logging in to Discord...');
client.login(process.env.STARBUNK_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    console.log(`📊 Final message count: ${messageCount}`);
    client.destroy();
    process.exit(0);
});
