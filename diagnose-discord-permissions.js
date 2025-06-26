#!/usr/bin/env node

// Discord permissions and intents diagnostic tool
const { Client, GatewayIntentBits, Events, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

const TARGET_GUILD_ID = '753251582719688714';

client.on('ready', async () => {
    console.log(`🤖 Diagnostic Bot ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds`);
    
    try {
        // Get the target guild
        const guild = await client.guilds.fetch(TARGET_GUILD_ID);
        console.log(`\n🏰 Target Guild: ${guild.name} (${guild.id})`);
        
        // Get bot member in guild
        const botMember = await guild.members.fetch(client.user.id);
        console.log(`🤖 Bot Member: ${botMember.displayName}`);
        
        // Check bot permissions in guild
        const guildPermissions = botMember.permissions;
        console.log('\n🔐 Guild-level Permissions:');
        console.log(`   Administrator: ${guildPermissions.has(PermissionsBitField.Flags.Administrator) ? '✅' : '❌'}`);
        console.log(`   Read Messages: ${guildPermissions.has(PermissionsBitField.Flags.ViewChannel) ? '✅' : '❌'}`);
        console.log(`   Send Messages: ${guildPermissions.has(PermissionsBitField.Flags.SendMessages) ? '✅' : '❌'}`);
        console.log(`   Manage Webhooks: ${guildPermissions.has(PermissionsBitField.Flags.ManageWebhooks) ? '✅' : '❌'}`);
        console.log(`   Use External Emojis: ${guildPermissions.has(PermissionsBitField.Flags.UseExternalEmojis) ? '✅' : '❌'}`);
        
        // Check channels
        console.log('\n📋 Channel Analysis:');
        const channels = guild.channels.cache.filter(ch => ch.isTextBased());
        console.log(`   Text channels found: ${channels.size}`);
        
        let accessibleChannels = 0;
        let webhookCapableChannels = 0;
        
        for (const [channelId, channel] of channels) {
            const channelPermissions = channel.permissionsFor(botMember);
            const canRead = channelPermissions.has(PermissionsBitField.Flags.ViewChannel);
            const canSend = channelPermissions.has(PermissionsBitField.Flags.SendMessages);
            const canWebhook = channelPermissions.has(PermissionsBitField.Flags.ManageWebhooks);
            
            if (canRead && canSend) {
                accessibleChannels++;
                console.log(`   📝 ${channel.name}: Read ✅ Send ✅ Webhook ${canWebhook ? '✅' : '❌'}`);
                
                if (canWebhook) {
                    webhookCapableChannels++;
                }
            } else {
                console.log(`   🚫 ${channel.name}: Read ${canRead ? '✅' : '❌'} Send ${canSend ? '✅' : '❌'} Webhook ${canWebhook ? '✅' : '❌'}`);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Accessible channels: ${accessibleChannels}/${channels.size}`);
        console.log(`   Webhook-capable channels: ${webhookCapableChannels}/${channels.size}`);
        
        // Test message event reception
        console.log('\n🧪 Testing message event reception...');
        console.log('   Setting up message listener...');
        
        let messageCount = 0;
        client.on(Events.MessageCreate, (message) => {
            messageCount++;
            console.log(`   📨 Message #${messageCount}: "${message.content}" from ${message.author.username} in #${message.channel.name}`);
        });
        
        // Send a test message to the first accessible channel
        if (accessibleChannels > 0) {
            const testChannel = channels.find(ch => {
                const perms = ch.permissionsFor(botMember);
                return perms.has(PermissionsBitField.Flags.ViewChannel) && 
                       perms.has(PermissionsBitField.Flags.SendMessages);
            });
            
            if (testChannel) {
                console.log(`\n🧪 Sending test message to #${testChannel.name}...`);
                try {
                    await testChannel.send('🤖 BunkBot diagnostic test - please ignore this message');
                    console.log('   ✅ Test message sent successfully');
                } catch (error) {
                    console.log(`   ❌ Failed to send test message: ${error.message}`);
                }
            }
        }
        
        // Keep running for a bit to catch any message events
        console.log('\n⏰ Monitoring for message events for 10 seconds...');
        setTimeout(() => {
            console.log(`\n📊 Final Results:`);
            console.log(`   Messages received during test: ${messageCount}`);
            console.log(`   Bot appears to be: ${messageCount > 0 ? '✅ Receiving events' : '❌ Not receiving events'}`);
            
            if (messageCount === 0) {
                console.log('\n🔍 Troubleshooting suggestions:');
                console.log('   1. Check if bot has MESSAGE_CONTENT intent enabled in Discord Developer Portal');
                console.log('   2. Verify bot is actually in the target guild');
                console.log('   3. Check if there are any Discord API outages');
                console.log('   4. Ensure bot token is valid and not expired');
            }
            
            process.exit(0);
        }, 10000);
        
    } catch (error) {
        console.error('❌ Error during diagnostic:', error);
        process.exit(1);
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️  Discord client warning:', warning);
});

// Login
console.log('🔐 Starting Discord permissions diagnostic...');
client.login(process.env.STARBUNK_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
