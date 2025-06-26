#!/usr/bin/env node

// Simple BunkBot test using regular message replies instead of webhooks
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

let messageCount = 0;

client.on('ready', () => {
    console.log(`🤖 Simple BunkBot Test is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds:`);
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log('🔍 Monitoring for messages containing "hello bunkbot"...');
    console.log('💡 This test uses regular message replies instead of webhooks');
});

client.on(Events.MessageCreate, async (message) => {
    messageCount++;
    
    console.log(`\n📨 Message #${messageCount} received:`);
    console.log(`   Author: ${message.author.username} (Bot: ${message.author.bot})`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Channel: ${message.channel.name || 'DM'} (${message.channel.id})`);
    console.log(`   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'N/A'})`);
    
    // Skip bot messages
    if (message.author.bot) {
        console.log('   ⏭️  Skipping bot message');
        return;
    }
    
    // Check for trigger
    if (message.content.toLowerCase().includes('hello bunkbot')) {
        console.log('   🎯 TRIGGER DETECTED! Responding with regular message reply...');
        
        try {
            // Use regular message reply instead of webhook
            await message.reply(`Hello ${message.author.username}! Simple BunkBot test is working! 🤖`);
            console.log('   ✅ Regular message reply sent successfully');
        } catch (error) {
            console.log('   ❌ Failed to send regular reply:', error.message);
            
            // Try channel.send as fallback
            try {
                console.log('   🔄 Trying channel.send as fallback...');
                await message.channel.send(`Hello ${message.author.username}! Simple BunkBot test is working! 🤖`);
                console.log('   ✅ Channel.send fallback successful');
            } catch (fallbackError) {
                console.log('   ❌ Channel.send fallback also failed:', fallbackError.message);
            }
        }
    } else {
        console.log('   ❌ No trigger found');
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️  Discord client warning:', warning);
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
    client.destroy();
    process.exit(0);
});
