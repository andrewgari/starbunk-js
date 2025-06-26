#!/usr/bin/env node

// Send a test message to trigger BunkBot and monitor the response
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TARGET_GUILD_ID = '753251582719688714';
const TEST_CHANNEL_NAME = 'bot-testing'; // Use bot-testing channel

client.on('ready', async () => {
    console.log(`🤖 Test Trigger Bot ready! Logged in as ${client.user.tag}`);
    
    try {
        // Get the target guild
        const guild = await client.guilds.fetch(TARGET_GUILD_ID);
        console.log(`🏰 Connected to guild: ${guild.name}`);
        
        // Find the bot-testing channel
        const testChannel = guild.channels.cache.find(ch => 
            ch.name === TEST_CHANNEL_NAME && ch.isTextBased()
        );
        
        if (!testChannel) {
            console.log(`❌ Could not find #${TEST_CHANNEL_NAME} channel`);
            process.exit(1);
        }
        
        console.log(`📝 Found test channel: #${testChannel.name} (${testChannel.id})`);
        
        // Set up message listener to catch BunkBot's response
        let responseReceived = false;
        client.on(Events.MessageCreate, (message) => {
            if (message.channel.id === testChannel.id && message.author.id !== client.user.id) {
                console.log(`📨 Response received from ${message.author.username}: "${message.content}"`);
                
                if (message.content.includes('BunkBot is working') || message.author.username === 'BunkBot') {
                    console.log('✅ BunkBot responded successfully!');
                    responseReceived = true;
                }
            }
        });
        
        // Send the trigger message
        console.log('🚀 Sending trigger message: "hello bunkbot"');
        await testChannel.send('hello bunkbot');
        console.log('✅ Trigger message sent');
        
        // Wait for response
        console.log('⏰ Waiting 15 seconds for BunkBot response...');
        setTimeout(() => {
            if (responseReceived) {
                console.log('🎉 SUCCESS: BunkBot is working correctly!');
            } else {
                console.log('❌ FAILURE: BunkBot did not respond to the trigger message');
                console.log('💡 Check the BunkBot container logs for debugging information');
            }
            process.exit(responseReceived ? 0 : 1);
        }, 15000);
        
    } catch (error) {
        console.error('❌ Error during test:', error);
        process.exit(1);
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

// Login
console.log('🔐 Starting BunkBot trigger test...');
client.login(process.env.STARBUNK_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
