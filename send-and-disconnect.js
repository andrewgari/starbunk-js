#!/usr/bin/env node

const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

async function sendTestMessage() {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });

    client.once('ready', async () => {
        console.log(`✅ Connected as ${client.user.tag}`);
        
        try {
            const guild = await client.guilds.fetch('798613445301633134');
            const channel = await guild.channels.fetch('798613445301633137');
            
            console.log('📤 Sending test message: "I love spiderman movies"');
            const message = await channel.send('I love spiderman movies');
            console.log(`✅ Message sent: ${message.id}`);
            
            await client.destroy();
            console.log('✅ Disconnected immediately to avoid conflicts');
            console.log('🔍 Check BunkBot logs for message processing...');
            
        } catch (error) {
            console.error('❌ Error:', error);
        }
    });

    const token = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN;
    await client.login(token);
}

sendTestMessage();