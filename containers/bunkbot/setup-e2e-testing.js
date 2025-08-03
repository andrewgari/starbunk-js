#!/usr/bin/env node

/**
 * E2E Testing Setup Script
 *
 * Sets up webhook-based E2E testing environment for production BunkBot validation.
 * This script helps configure the isolated testing environment that tests against
 * the live production bot instance.
 */

// Load environment variables from .env file
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const config = {
  testChannelId: process.env.E2E_TEST_CHANNEL_ID || '798613445301633137',
  monitorToken: process.env.E2E_MONITOR_TOKEN || process.env.STARBUNK_TOKEN,
  webhookUrl: process.env.E2E_WEBHOOK_URL
};

console.log('🔧 E2E Testing Environment Setup');
console.log('=================================');
console.log();

console.log('📋 Current Configuration:');
console.log(`   Test Channel ID: ${config.testChannelId}`);
console.log(`   Monitor Token: ${config.monitorToken ? 'Set' : 'Not set'}`);
console.log(`   Webhook URL: ${config.webhookUrl ? 'Set' : 'Not set'}`);
console.log();

if (!config.monitorToken) {
  console.log('❌ Missing E2E_MONITOR_TOKEN or STARBUNK_TOKEN');
  console.log('   This token is needed to monitor bot responses');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks
  ]
});

client.once('ready', async () => {
  console.log(`✅ Connected as ${client.user.tag}`);
  console.log();

  try {
    // Test 1: Validate test channel access
    console.log('📺 Testing Channel Access...');
    const testChannel = await client.channels.fetch(config.testChannelId);
    
    if (!testChannel) {
      console.log('❌ Test channel not found or not accessible');
      return;
    }
    
    if (!testChannel.isTextBased()) {
      console.log('❌ Test channel is not a text channel');
      return;
    }
    
    console.log(`✅ Test channel accessible: ${testChannel.name}`);

    // Test 2: Check webhook setup
    console.log('🔗 Testing Webhook Configuration...');
    
    if (!config.webhookUrl) {
      console.log('⚠️ E2E_WEBHOOK_URL not configured');
      console.log('💡 To set up webhook:');
      console.log('   1. Go to Discord channel settings');
      console.log('   2. Navigate to Integrations > Webhooks');
      console.log('   3. Create new webhook or copy existing webhook URL');
      console.log('   4. Set E2E_WEBHOOK_URL environment variable');
      console.log();
    } else {
      console.log('✅ Webhook URL configured');
      
      // Test webhook by fetching existing webhooks
      try {
        const webhooks = await testChannel.fetchWebhooks();
        console.log(`✅ Can access webhooks (${webhooks.size} found)`);
      } catch (error) {
        console.log(`⚠️ Cannot access webhooks: ${error.message}`);
      }
    }

    // Test 3: Check production bot presence
    console.log('🤖 Checking Production Bot Status...');
    
    // Look for recent messages from BunkBot-related bots
    try {
      const recentMessages = await testChannel.messages.fetch({ limit: 50 });
      const botMessages = recentMessages.filter(msg => msg.author.bot);
      
      if (botMessages.size > 0) {
        console.log(`✅ Found ${botMessages.size} recent bot messages`);
        
        const uniqueBots = new Set(botMessages.map(msg => msg.author.username));
        console.log(`   Active bots: ${Array.from(uniqueBots).join(', ')}`);
        
        // Check for BunkBot-related bots
        const bunkBots = Array.from(uniqueBots).filter(name => 
          name.includes('Bot') || name.includes('bot') || 
          ['BlueBot', 'HoldBot', 'GuyBot', 'ChadBot', 'VennBot'].includes(name)
        );
        
        if (bunkBots.length > 0) {
          console.log(`✅ BunkBot-related bots detected: ${bunkBots.join(', ')}`);
        } else {
          console.log('⚠️ No BunkBot-related bots detected in recent messages');
        }
      } else {
        console.log('⚠️ No recent bot messages found');
        console.log('💡 Production BunkBot may be offline or not active in this channel');
      }
    } catch (error) {
      console.log(`⚠️ Cannot fetch recent messages: ${error.message}`);
    }

    console.log();
    console.log('📊 Setup Summary:');
    console.log('=================');
    
    const checks = [
      { name: 'Monitor Token', status: !!config.monitorToken },
      { name: 'Test Channel Access', status: !!testChannel },
      { name: 'Webhook URL', status: !!config.webhookUrl }
    ];
    
    checks.forEach(check => {
      console.log(`   ${check.status ? '✅' : '❌'} ${check.name}`);
    });
    
    const allGood = checks.every(check => check.status);
    
    console.log();
    if (allGood) {
      console.log('🚀 E2E Testing Environment Ready!');
      console.log();
      console.log('To run E2E tests:');
      console.log('   cd containers/bunkbot');
      console.log('   npm test -- comprehensive-e2e-identity.test.ts');
      console.log();
      console.log('Expected behavior:');
      console.log('   ✅ Tests send webhook messages to Discord');
      console.log('   ✅ Production BunkBot processes and responds');
      console.log('   ✅ Tests validate bot custom identities (names/avatars)');
      console.log('   ✅ All bots appear with custom identities, not default bot identity');
    } else {
      console.log('⚠️ E2E Testing Environment needs configuration');
      console.log();
      console.log('Required setup:');
      if (!config.monitorToken) {
        console.log('   - Set E2E_MONITOR_TOKEN or STARBUNK_TOKEN');
      }
      if (!config.webhookUrl) {
        console.log('   - Set E2E_WEBHOOK_URL with Discord webhook URL');
      }
      console.log();
      console.log('Optional but recommended:');
      console.log('   - Ensure production BunkBot is running and active');
      console.log('   - Verify bot has webhook permissions in test channel');
    }

  } catch (error) {
    console.error('❌ Setup validation failed:', error);
  } finally {
    client.destroy();
  }
});

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
  process.exit(1);
});

console.log('🔐 Connecting to Discord for validation...');
client.login(config.monitorToken).catch(error => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});
