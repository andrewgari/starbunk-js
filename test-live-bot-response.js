#!/usr/bin/env node

/**
 * Test script to send a message to Discord and verify bot response with correct identity
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { config } = require('dotenv');

// Load environment variables
config({ path: './containers/bunkbot/.env' });

const TOKEN = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN;
const GUILD_ID = '753251582719688714'; // StarBunk Crusaders.jpg
const COVA_USER_ID = '139592376443338752';

if (!TOKEN) {
    console.error('❌ No Discord token found');
    process.exit(1);
}

console.log('🎯 Testing Live Bot Response with Identity Verification');
console.log('=====================================================');
console.log(`🏰 Target Guild: ${GUILD_ID}`);
console.log(`👤 Target User: Cova (${COVA_USER_ID})`);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let testMessageSent = false;
let botResponseReceived = false;

client.once('ready', async () => {
    console.log(`✅ Connected as ${client.user.tag}`);
    
    try {
        // Get the guild
        const guild = await client.guilds.fetch(GUILD_ID);
        console.log(`🏰 Found guild: ${guild.name}`);
        
        // Get a general channel to test in
        const channels = await guild.channels.fetch();
        const textChannel = channels.find(ch => ch.isTextBased() && ch.name.includes('general'));
        
        if (!textChannel) {
            console.error('❌ No suitable text channel found');
            process.exit(1);
        }
        
        console.log(`📺 Using channel: #${textChannel.name} (${textChannel.id})`);
        
        // Check if Cova is in the guild
        const member = await guild.members.fetch(COVA_USER_ID);
        if (member) {
            console.log(`✅ Found Cova: ${member.displayName}`);
            console.log(`🖼️  Avatar: ${member.displayAvatarURL()}`);
        } else {
            console.log(`❌ Cova not found in guild`);
        }
        
        // Set up message listener
        client.on('messageCreate', (message) => {
            if (message.author.id === client.user.id) return; // Skip our own messages
            
            // Check if this is a webhook message (bot response)
            if (message.webhookId && message.channel.id === textChannel.id) {
                botResponseReceived = true;
                console.log(`\n🤖 Bot Response Received!`);
                console.log(`   👤 Name: "${message.author.username}"`);
                console.log(`   🖼️  Avatar: ${message.author.displayAvatarURL()}`);
                console.log(`   💬 Content: "${message.content}"`);
                console.log(`   🕒 Timestamp: ${message.createdAt.toISOString()}`);
                
                // Verify identity
                if (message.author.username === 'Coob' || message.author.username.includes('Cova')) {
                    console.log(`   ✅ Identity appears correct (shows as Cova/Coob)`);
                } else {
                    console.log(`   ⚠️  Identity may not be Cova (shows as "${message.author.username}")`);
                }
                
                console.log(`\n🎉 Test completed successfully!`);
                setTimeout(() => process.exit(0), 2000);
            }
        });
        
        // Wait a moment for listener setup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send test message to trigger Nice Bot (responds to 69)
        console.log(`\n🚀 Sending test message to trigger Nice Bot...`);
        await textChannel.send('The number is 69');
        testMessageSent = true;
        console.log(`✅ Test message sent: "The number is 69"`);
        console.log(`⏳ Waiting for bot response...`);
        
        // Timeout after 15 seconds
        setTimeout(() => {
            if (!botResponseReceived) {
                console.log(`\n⏰ No response received after 15 seconds`);
                console.log(`📊 Test Results:`);
                console.log(`   Message sent: ${testMessageSent ? '✅' : '❌'}`);
                console.log(`   Bot response: ${botResponseReceived ? '✅' : '❌'}`);
                console.log(`\n🔍 Possible issues:`);
                console.log(`   - Bot may not be responding due to missing TESTING_CHANNEL_IDS`);
                console.log(`   - Bot may not be processing messages in this channel`);
                console.log(`   - Bot may be in a different mode or configuration`);
            }
            process.exit(0);
        }, 15000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
    process.exit(1);
});

console.log('🔌 Connecting to Discord...');
client.login(TOKEN);
