#!/usr/bin/env node

// Final comprehensive diagnosis to identify the exact BunkBot issue
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

console.log('🔍 FINAL BUNKBOT DIAGNOSIS');
console.log('==========================');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

const TARGET_GUILD_ID = '753251582719688714';
let messageCount = 0;

client.on('ready', async () => {
    console.log(`🤖 Diagnostic ready! Logged in as ${client.user.tag}`);
    
    const guild = await client.guilds.fetch(TARGET_GUILD_ID);
    console.log(`🏰 Target guild: ${guild.name}`);
    
    // List all channels the bot can see
    console.log('\n📋 Channels the bot can access:');
    const channels = guild.channels.cache.filter(ch => ch.isTextBased());
    channels.forEach(channel => {
        const perms = channel.permissionsFor(guild.members.me);
        const canRead = perms.has('ViewChannel');
        const canSend = perms.has('SendMessages');
        const canWebhook = perms.has('ManageWebhooks');
        
        console.log(`   ${canRead ? '✅' : '❌'} #${channel.name} - Read: ${canRead}, Send: ${canSend}, Webhook: ${canWebhook}`);
    });
    
    console.log('\n🔍 Now monitoring ALL message events...');
    console.log('💡 Send a message containing "test bunkbot" in ANY channel');
});

client.on(Events.MessageCreate, async (message) => {
    messageCount++;
    
    console.log(`\n📨 MESSAGE EVENT #${messageCount} [${new Date().toISOString()}]`);
    console.log(`   Author: ${message.author.username} (ID: ${message.author.id})`);
    console.log(`   Bot: ${message.author.bot}`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Channel: #${message.channel.name} (ID: ${message.channel.id})`);
    console.log(`   Guild: ${message.guild?.name} (ID: ${message.guild?.id})`);
    
    // Test the exact same logic as BunkBot
    if (message.author.bot) {
        console.log('   ⏭️  SKIPPED: Bot message');
        return;
    }
    
    console.log('   ✅ PROCESSING: Human message');
    
    // Check for any trigger words
    const content = message.content.toLowerCase();
    if (content.includes('hello bunkbot') || content.includes('test bunkbot')) {
        console.log('   🎯 TRIGGER DETECTED!');
        
        try {
            // Test webhook creation (like BunkBot does)
            console.log('   🔧 Testing webhook creation...');
            
            const webhooks = await message.channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.name === 'Starbunk Bot');
            
            if (!webhook) {
                console.log('   📝 Creating new webhook...');
                webhook = await message.channel.createWebhook({
                    name: 'Starbunk Bot',
                    reason: 'Bot message delivery',
                });
                console.log('   ✅ Webhook created successfully');
            } else {
                console.log('   ✅ Using existing webhook');
            }
            
            // Send webhook message (like BunkBot does)
            console.log('   📤 Sending webhook message...');
            await webhook.send({
                content: `Hello ${message.author.username}! Diagnostic test successful! 🤖`,
                username: 'BunkBot',
                avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
            });
            console.log('   ✅ WEBHOOK MESSAGE SENT SUCCESSFULLY!');
            
        } catch (error) {
            console.log('   ❌ WEBHOOK ERROR:', error.message);
            
            // Fallback to regular message
            try {
                console.log('   🔄 Trying regular message as fallback...');
                await message.reply('Diagnostic test - webhook failed but regular message works!');
                console.log('   ✅ FALLBACK MESSAGE SENT!');
            } catch (fallbackError) {
                console.log('   ❌ FALLBACK ALSO FAILED:', fallbackError.message);
            }
        }
    } else {
        console.log('   ❌ No trigger found');
    }
});

client.on('error', (error) => {
    console.log('❌ Discord error:', error);
});

client.on('warn', (warning) => {
    console.log('⚠️  Discord warning:', warning);
});

// Login
console.log('🔐 Logging in...');
client.login(process.env.STARBUNK_TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n🛑 Shutting down... Total messages processed: ${messageCount}`);
    client.destroy();
    process.exit(0);
});
