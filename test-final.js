#!/usr/bin/env node

/**
 * Final test of BunkBot - sends a test message and monitors for bot responses
 */

const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

async function testBunkBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ]
    });

    console.log('🧪 Testing BunkBot functionality...');

    let responses = [];
    let testSentTime = 0;

    // Monitor for bot responses
    client.on(Events.MessageCreate, (message) => {
        if (message.author.bot && 
            message.author.id !== client.user.id && 
            message.createdTimestamp > testSentTime) {
            
            responses.push({
                author: message.author.username,
                content: message.content,
                timestamp: message.createdTimestamp
            });
            
            console.log(`🤖 Bot Response: ${message.author.username}: "${message.content}"`);
        }
    });

    client.once('ready', async () => {
        console.log(`✅ Test client ready: ${client.user.tag}`);
        
        try {
            const testChannelId = '798613445301633137';
            const testGuildId = '798613445301633134';
            
            const guild = await client.guilds.fetch(testGuildId);
            const channel = await guild.channels.fetch(testChannelId);
            
            console.log(`📍 Testing in #${channel.name}`);
            console.log('📤 Sending test message: "I love spiderman movies"');
            
            testSentTime = Date.now();
            const testMessage = await channel.send('I love spiderman movies');
            console.log(`✅ Message sent: ${testMessage.id}`);
            
            // Wait for responses
            console.log('⏳ Waiting 10 seconds for Spider-Bot response...');
            
            setTimeout(async () => {
                if (responses.length > 0) {
                    console.log('\n🎉 SUCCESS! BunkBot is working!');
                    console.log('📊 Responses received:');
                    responses.forEach(r => {
                        console.log(`   - ${r.author}: "${r.content}"`);
                    });
                    
                    // Check if Spider-Bot responded correctly
                    const spiderResponse = responses.find(r => 
                        r.content.toLowerCase().includes('spider-man') || 
                        r.content.toLowerCase().includes('hyphen')
                    );
                    
                    if (spiderResponse) {
                        console.log('✅ Spider-Bot responded correctly!');
                    } else {
                        console.log('⚠️ Spider-Bot did not respond as expected');
                    }
                } else {
                    console.log('\n❌ No bot responses received');
                    console.log('This could mean:');
                    console.log('1. BunkBot is not receiving message events');
                    console.log('2. Message filtering is blocking the message');
                    console.log('3. Bot conditions are not matching');
                }
                
                // Clean up
                try {
                    await testMessage.delete();
                    console.log('🗑️ Test message cleaned up');
                } catch (error) {
                    // Ignore cleanup errors
                }
                
                await client.destroy();
                process.exit(0);
                
            }, 10000);
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            process.exit(1);
        }
    });

    const token = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN;
    await client.login(token);
}

testBunkBot();