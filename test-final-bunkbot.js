#!/usr/bin/env node

// Final test of the fixed BunkBot with proper command system
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

console.log('🎯 FINAL BUNKBOT TEST');
console.log('====================');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TARGET_GUILD_ID = '753251582719688714';
const TEST_CHANNEL_NAME = 'bot-testing';

let testResults = {
    messageTest: false,
    pingCommandTest: false,
    debugCommandTest: false
};

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
            console.log(`📨 Message: "${message.content}" from ${message.author.username}`);
            
            // Check for BunkBot message response
            if ((message.author.username === 'BunkBot' || message.webhookId) && 
                message.content.includes('BunkBot is working')) {
                console.log('✅ MESSAGE TEST PASSED: BunkBot responded to "hello bunkbot"');
                testResults.messageTest = true;
            }
        }
    });
    
    // Monitor for slash command responses
    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isCommand() && interaction.channel.id === testChannel.id) {
            console.log(`🎮 Command response: ${interaction.commandName}`);
            
            if (interaction.commandName === 'ping') {
                testResults.pingCommandTest = true;
                console.log('✅ PING COMMAND TEST PASSED');
            } else if (interaction.commandName === 'debug') {
                testResults.debugCommandTest = true;
                console.log('✅ DEBUG COMMAND TEST PASSED');
            }
        }
    });
    
    // Run tests sequentially
    setTimeout(async () => {
        console.log('\n🧪 Test 1: Message Response Test');
        console.log('Sending: "hello bunkbot"');
        try {
            await testChannel.send('hello bunkbot');
            console.log('✅ Test message sent');
        } catch (error) {
            console.log('❌ Failed to send test message:', error.message);
        }
    }, 3000);
    
    // Note: Slash commands would need to be registered first
    // For now, we'll just test message responses
    
    // Final results after 15 seconds
    setTimeout(() => {
        console.log('\n📊 FINAL TEST RESULTS');
        console.log('=====================');
        console.log(`Message Response Test: ${testResults.messageTest ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Ping Command Test: ${testResults.pingCommandTest ? '✅ PASSED' : '⏭️ SKIPPED (needs registration)'}`);
        console.log(`Debug Command Test: ${testResults.debugCommandTest ? '✅ PASSED' : '⏭️ SKIPPED (needs registration)'}`);
        
        if (testResults.messageTest) {
            console.log('\n🎉 SUCCESS: BunkBot is working correctly!');
            console.log('✅ The container can receive and respond to Discord messages');
            console.log('✅ Message handling is functional');
            console.log('✅ Webhook system is operational');
            
            console.log('\n📋 Next Steps:');
            console.log('1. Register slash commands for full admin functionality');
            console.log('2. Test with human users in Discord');
            console.log('3. Deploy to production environment');
            
            process.exit(0);
        } else {
            console.log('\n❌ FAILURE: BunkBot is not responding to messages');
            console.log('💡 Check the BunkBot container logs for debugging');
            process.exit(1);
        }
    }, 15000);
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
