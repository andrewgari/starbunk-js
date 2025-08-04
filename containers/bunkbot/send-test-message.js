#!/usr/bin/env node

/**
 * Send a test message using the production bot token to trigger a response
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { config } = require('dotenv');

// Load environment variables
config({ path: './.env' });

// Use the production token that the container is using
const TOKEN = process.env.STARBUNK_TOKEN; // This is what the container uses
const GUILD_ID = '753251582719688714'; // StarBunk Crusaders.jpg

if (!TOKEN) {
    console.error('❌ No STARBUNK_TOKEN found');
    process.exit(1);
}

console.log('🎯 Sending Test Message to Trigger Bot Response');
console.log('===============================================');
console.log(`🏰 Target Guild: ${GUILD_ID}`);
console.log(`🔑 Using Token: ${TOKEN.substring(0, 20)}...`);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`✅ Connected as ${client.user.tag}`);
    
    try {
        // Get the guild
        const guild = await client.guilds.fetch(GUILD_ID);
        console.log(`🏰 Found guild: ${guild.name}`);
        
        // Get channels
        const channels = await guild.channels.fetch();
        const textChannels = channels.filter(ch => ch.isTextBased());
        
        console.log(`📺 Available text channels:`);
        textChannels.forEach(ch => {
            console.log(`   - #${ch.name} (${ch.id})`);
        });
        
        // Find a general channel
        const generalChannel = textChannels.find(ch => 
            ch.name.includes('general') || 
            ch.name.includes('test') || 
            ch.name.includes('bot')
        ) || textChannels.first();
        
        if (!generalChannel) {
            console.error('❌ No suitable text channel found');
            process.exit(1);
        }
        
        console.log(`📺 Using channel: #${generalChannel.name} (${generalChannel.id})`);
        
        // Send test message to trigger Nice Bot (responds to 69)
        console.log(`\n🚀 Sending test message to trigger Nice Bot...`);
        const message = await generalChannel.send('Testing bot response with number 69');
        console.log(`✅ Test message sent: "${message.content}"`);
        console.log(`🔗 Message ID: ${message.id}`);
        console.log(`📍 Channel: #${generalChannel.name}`);
        
        console.log(`\n⏳ Message sent! Check the Discord channel and container logs for bot response.`);
        console.log(`🔍 If the bot responds, it should show as "Coob" with Cova's avatar.`);
        
        // Wait a moment then exit
        setTimeout(() => {
            console.log(`\n✅ Test message sending completed.`);
            console.log(`📋 Next steps:`);
            console.log(`   1. Check Discord channel for bot response`);
            console.log(`   2. Check container logs: podman logs starbunk-bunkbot`);
            console.log(`   3. Verify response shows correct identity (Coob + Cova's avatar)`);
            process.exit(0);
        }, 3000);
        
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
