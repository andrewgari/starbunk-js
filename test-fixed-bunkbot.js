#!/usr/bin/env node

// Test the fixed BunkBot container
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

console.log('🧪 TESTING FIXED BUNKBOT');
console.log('========================');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TARGET_GUILD_ID = '753251582719688714';
const TEST_CHANNEL_NAME = 'bot-testing';

let testMessageSent = false;
let bunkbotResponseReceived = false;

client.on('ready', async () => {
    console.log(`🤖 Test client ready! Logged in as ${client.user.tag}`);
    
    const guild = await client.guilds.fetch(TARGET_GUILD_ID);
    const testChannel = guild.channels.cache.find(ch => 
        ch.name === TEST_CHANNEL_NAME && ch.isTextBased()
    );
    
    if (!testChannel) {
        console.log(`❌ Could not find #${TEST_CHANNEL_NAME} channel`);
        process.exit(1);
    }
    
    console.log(`📝 Using test channel: #${testChannel.name}`);
    
    // Monitor for BunkBot responses
    client.on(Events.MessageCreate, (message) => {
        if (message.channel.id === testChannel.id) {
            console.log(`📨 Message in test channel: "${message.content}" from ${message.author.username}`);
            
            // Check if this is a BunkBot response
            if (message.author.username === 'BunkBot' || 
                message.content.includes('BunkBot is working') ||
                message.webhookId) {
                console.log('🎉 BUNKBOT RESPONSE DETECTED!');
                bunkbotResponseReceived = true;
            }
        }
    });
    
    // Send test message after 5 seconds
    setTimeout(async () => {
        console.log('🚀 Sending test message: "hello bunkbot"');
        try {
            await testChannel.send('hello bunkbot');
            testMessageSent = true;
            console.log('✅ Test message sent successfully');
            
            // Wait 15 seconds for response
            setTimeout(() => {
                console.log('\n📊 TEST RESULTS:');
                console.log('================');
                console.log(`Test message sent: ${testMessageSent ? '✅' : '❌'}`);
                console.log(`BunkBot response received: ${bunkbotResponseReceived ? '✅' : '❌'}`);
                
                if (bunkbotResponseReceived) {
                    console.log('\n🎉 SUCCESS: Fixed BunkBot is working correctly!');
                    console.log('✅ The container can receive and respond to Discord messages');
                    process.exit(0);
                } else {
                    console.log('\n❌ FAILURE: BunkBot did not respond');
                    console.log('💡 Check the BunkBot container logs for debugging');
                    process.exit(1);
                }
            }, 15000);
            
        } catch (error) {
            console.log('❌ Failed to send test message:', error.message);
            process.exit(1);
        }
    }, 5000);
});

client.on('error', (error) => {
    console.log('❌ Discord error:', error);
});

// Login
console.log('🔐 Logging in...');
client.login(process.env.STARBUNK_TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    client.destroy();
    process.exit(1);
});
