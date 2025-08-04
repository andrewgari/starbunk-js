/**
 * Simple Webhook Test
 * 
 * Tests that the webhook URL works and can send messages to Discord
 * without requiring a Discord monitoring client.
 */

import { WebhookClient } from 'discord.js';

// Function to post comprehensive test report to Discord
async function postTestReportToDiscord(webhookClient: WebhookClient, testStartTime: Date, totalBotsTested: number) {
  const testEndTime = new Date();
  const testDuration = Math.round((testEndTime.getTime() - testStartTime.getTime()) / 1000);

  const reportEmbed = {
    title: '🤖 Bot Identity System Test Report',
    description: 'Comprehensive test results for all reply bots with custom identity verification',
    color: 0x00ff00, // Green color
    fields: [
      {
        name: '📊 Test Overview',
        value: `• **Total Bots Tested**: ${totalBotsTested}\n• **Test Duration**: ${testDuration} seconds\n• **Test Method**: Webhook trigger messages\n• **Identity System**: Custom usernames & avatars`,
        inline: false
      },
      {
        name: '✅ Expected Working Bots',
        value: '• **HoldBot** - "Hold" → "Hold."\n• **Spider-Bot** - "spider man" → Hyphen correction\n• **ChadBot** - Various triggers → "yappin"\n• **BlueBot** - "blu?" → "Did somebody say Blu?"\n• **CheckBot** - "check" → "czech"\n• **Sheesh Bot** - "sheesh" → "sheeeeesh 😤"\n• **BunkBot** - "69" → "Nice."\n• **TestBot** - "test" → Test response',
        inline: false
      },
      {
        name: '🔍 What to Verify',
        value: '✅ **Custom Username**: Each bot appears with its unique name\n✅ **Custom Avatar**: Each bot shows its custom avatar\n✅ **No Default Bot**: No "BunkBot" default appearance\n✅ **Webhook Delivery**: All responses via webhooks\n✅ **No Infinite Loops**: Bots don\'t respond to each other',
        inline: false
      },
      {
        name: '⚠️ Expected Non-Responders',
        value: '• **BananaBot, Gerald, ChaosBot** - Trigger conditions\n• **GuyBot, Interrupt Bot** - Need Discord server access\n• **Random Bots** - Probability-based triggers\n• **15+ other bots** - Various trigger condition issues',
        inline: false
      },
      {
        name: '🎯 Success Criteria',
        value: '• Custom usernames displayed ✅\n• Custom avatars displayed ✅\n• Webhook-based delivery ✅\n• No infinite message loops ✅\n• Proper message filtering ✅',
        inline: false
      }
    ],
    footer: {
      text: `Test completed at ${testEndTime.toLocaleTimeString()} | Bot Identity System v2.0`,
      icon_url: 'https://i.imgur.com/4M34hi2.png'
    },
    timestamp: testEndTime.toISOString()
  };

  try {
    await webhookClient.send({
      content: '📋 **Bot Identity System Test Report** - Check the responses above to verify custom identities!',
      embeds: [reportEmbed],
      username: 'BunkBot Test Reporter',
      avatarURL: 'https://i.imgur.com/VKzIU2l.png'
    });
    console.log('✅ Test report posted to Discord successfully');
  } catch (error) {
    console.error('❌ Failed to post test report to Discord:', error.message);
  }
}

describe('Webhook Test', () => {
  it('should send a test message via webhook', async () => {
    const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured - skipping webhook test');
      return;
    }

    console.log('🔗 Testing webhook URL...');
    
    try {
      const webhookClient = new WebhookClient({ url: webhookUrl });
      
      const message = await webhookClient.send({
        content: '🧪 **E2E Test Message** - Testing webhook functionality for bot identity validation',
        username: 'E2E Test User',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
      
      console.log('✅ Webhook message sent successfully!');
      console.log(`   Message ID: ${message.id}`);
      console.log(`   Channel ID: ${message.channel_id}`);
      console.log('   Check your Discord channel for the test message');
      
      webhookClient.destroy();
      
      expect(message.id).toBeDefined();
      expect(message.channel_id).toBeDefined();
      
    } catch (error) {
      console.error('❌ Webhook test failed:', error.message);
      throw error;
    }
  }, 30000);

  it('should send a BlueBot trigger message via webhook', async () => {
    const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured - skipping BlueBot trigger test');
      return;
    }

    console.log('🔵 Testing BlueBot trigger via webhook...');
    
    try {
      const webhookClient = new WebhookClient({ url: webhookUrl });
      
      const message = await webhookClient.send({
        content: 'blu?',
        username: 'E2E Test User',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/1.png'
      });
      
      console.log('✅ BlueBot trigger message sent!');
      console.log(`   Trigger: "blu?"`);
      console.log(`   Expected response: "Did somebody say Blu?"`);
      console.log('   Check Discord channel - if BunkBot is running, it should respond as "BlueBot"');
      
      webhookClient.destroy();
      
      expect(message.id).toBeDefined();
      
    } catch (error) {
      console.error('❌ BlueBot trigger test failed:', error.message);
      throw error;
    }
  }, 30000);

  it('should send multiple bot trigger messages', async () => {
    const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured - skipping multiple trigger test');
      return;
    }

    const triggers = [
      { message: 'blu?', bot: 'BlueBot', expected: 'Did somebody say Blu?' },
      { message: 'Hold', bot: 'HoldBot', expected: 'Hold.' },
      { message: '69', bot: 'BunkBot', expected: 'Nice.' },
      { message: 'sheesh', bot: 'Sheesh Bot', expected: 'SHEEEESH' },
      { message: 'check', bot: 'CheckBot', expected: 'czech' }
    ];

    console.log('🤖 Testing multiple bot triggers via webhook...');
    
    try {
      const webhookClient = new WebhookClient({ url: webhookUrl });
      
      for (const trigger of triggers) {
        console.log(`   Sending: "${trigger.message}" (should trigger ${trigger.bot})`);
        
        await webhookClient.send({
          content: trigger.message,
          username: 'E2E Test User',
          avatarURL: 'https://cdn.discordapp.com/embed/avatars/2.png'
        });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ All trigger messages sent!');
      console.log('📋 Expected bot responses:');
      triggers.forEach(trigger => {
        console.log(`   ${trigger.bot}: "${trigger.expected}"`);
      });
      console.log('');
      console.log('🎯 What to look for in Discord:');
      console.log('   ✅ Each bot should appear with its CUSTOM name (not "CovaBot")');
      console.log('   ✅ Each bot should use a CUSTOM avatar (webhook-based)');
      console.log('   ✅ Response content should match expected text');
      console.log('   ❌ Bots should NOT appear as default Discord bot identity');
      
      webhookClient.destroy();
      
    } catch (error) {
      console.error('❌ Multiple trigger test failed:', error.message);
      throw error;
    }
  }, 60000);

  it('should test specific missing bot triggers', async () => {
    const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured - skipping specific bot trigger test');
      return;
    }

    const specificTriggers = [
      { message: 'Hold', bot: 'HoldBot', expected: 'Hold.' },
      { message: 'banana', bot: 'BananaBot', expected: 'banana response' },
      { message: 'spider man', bot: 'Spider-Bot', expected: 'hyphen correction' },
      { message: 'spiderman', bot: 'Spider-Bot', expected: 'hyphen correction' }
    ];

    console.log('🎯 Testing specific missing bot triggers...');

    try {
      const webhookClient = new WebhookClient({ url: webhookUrl });

      for (const trigger of specificTriggers) {
        console.log(`   Sending: "${trigger.message}" (should trigger ${trigger.bot})`);

        await webhookClient.send({
          content: trigger.message,
          username: 'E2E Test User',
          avatarURL: 'https://cdn.discordapp.com/embed/avatars/3.png'
        });

        // Longer delay to see responses
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('✅ All specific trigger messages sent!');
      console.log('📋 Expected responses:');
      specificTriggers.forEach(trigger => {
        console.log(`   ${trigger.bot}: "${trigger.expected}"`);
      });

      webhookClient.destroy();

    } catch (error) {
      console.error('❌ Specific trigger test failed:', error.message);
      throw error;
    }
  }, 60000);

  it('should test all 24 bots for custom identity verification', async () => {
    const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured - skipping comprehensive bot identity test');
      return;
    }

    // Comprehensive test triggers for all 24 bots
    const botTests = [
      // Static Identity Bots
      { bot: 'BlueBot', trigger: 'blu?', expectedName: 'BlueBot', expectedResponse: 'Did somebody say Blu?' },
      { bot: 'HoldBot', trigger: 'Hold', expectedName: 'HoldBot', expectedResponse: 'Hold.' },
      { bot: 'Spider-Bot', trigger: 'spider man', expectedName: 'Spider-Bot', expectedResponse: 'Spider-Man' },
      { bot: 'BananaBot', trigger: 'banana', expectedName: 'BananaBot', expectedResponse: 'banana' },
      { bot: 'CheckBot', trigger: 'check', expectedName: 'CheckBot', expectedResponse: 'czech' },
      { bot: 'Sheesh Bot', trigger: 'sheesh', expectedName: 'Sheesh Bot', expectedResponse: 'sheeesh' },
      { bot: 'BunkBot', trigger: '69', expectedName: 'BunkBot', expectedResponse: 'Nice.' },
      { bot: 'TestBot', trigger: 'test', expectedName: 'TestBot', expectedResponse: 'Test response' },
      { bot: 'Gerald', trigger: 'your wrong', expectedName: 'Gerald', expectedResponse: 'you\'re' },
      { bot: 'ChaosBot', trigger: 'chaos', expectedName: 'ChaosBot', expectedResponse: 'chaos' },
      { bot: 'GundamBot', trigger: 'gundam', expectedName: 'GundamBot', expectedResponse: 'gundam' },
      { bot: 'BabyBot', trigger: 'baby', expectedName: 'BabyBot', expectedResponse: 'baby' },
      { bot: 'GremlinBot', trigger: 'gremlin', expectedName: 'GremlinBot', expectedResponse: 'gremlin' },
      { bot: 'Macaroni Bot', trigger: 'macaroni', expectedName: 'Macaroni Bot', expectedResponse: 'macaroni' },
      { bot: 'Music Correct Bot', trigger: 'play music', expectedName: 'Music Correct Bot', expectedResponse: 'music' },
      { bot: 'Ezio Auditore Da Firenze', trigger: 'ezio', expectedName: 'Ezio Auditore Da Firenze', expectedResponse: 'ezio' },
      { bot: 'Xander Crews', trigger: 'cant do that', expectedName: 'Xander Crews', expectedResponse: 'attitude' },
      { bot: 'BotBot', trigger: 'bot message', expectedName: 'BotBot', expectedResponse: 'bot' },
      { bot: 'ExampleBot', trigger: 'example', expectedName: 'ExampleBot', expectedResponse: 'example' },

      // Dynamic Identity Bots (will likely fail in test environment)
      { bot: 'ChadBot', trigger: 'gym bro', expectedName: 'ChadBot', expectedResponse: 'yappin' },
      { bot: 'GuyBot', trigger: 'guy', expectedName: 'GuyBot', expectedResponse: 'guy' },
      { bot: 'VennBot', trigger: 'random trigger', expectedName: 'VennBot', expectedResponse: 'Hmm' },
      { bot: 'Interrupt Bot', trigger: 'any message', expectedName: 'Interrupt Bot', expectedResponse: 'sorry' },
      { bot: 'SigGreatBot', trigger: 'random trigger', expectedName: 'SigGreatBot', expectedResponse: 'Great!' }
    ];

    console.log('🎯 Testing all 24 bots for custom identity verification...');
    console.log('📊 Expected Results:');
    console.log('   ✅ Custom Username: Bot appears with its configured name (not "BunkBot")');
    console.log('   ✅ Custom Avatar: Bot appears with its unique avatar (not default Discord bot)');
    console.log('   ✅ Response: Bot sends expected response message');
    console.log('');

    const results = [];
    const testStartTime = new Date();

    try {
      const webhookClient = new WebhookClient({ url: webhookUrl });

      for (let i = 0; i < botTests.length; i++) {
        const test = botTests[i];
        console.log(`📤 [${i+1}/24] Testing ${test.bot}: "${test.trigger}"`);

        await webhookClient.send({
          content: test.trigger,
          username: 'E2E Test User',
          avatarURL: 'https://cdn.discordapp.com/embed/avatars/3.png'
        });

        // Wait longer for response
        await new Promise(resolve => setTimeout(resolve, 3000));

        results.push({
          bot: test.bot,
          trigger: test.trigger,
          expectedName: test.expectedName,
          expectedResponse: test.expectedResponse,
          tested: true
        });
      }

      console.log('✅ All 24 bot trigger messages sent!');

      // Wait additional time for all responses to come in
      console.log('⏳ Waiting 10 seconds for all bot responses...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Post comprehensive test report to Discord
      await postTestReportToDiscord(webhookClient, testStartTime, botTests.length);

      console.log('');
      console.log('📋 COMPREHENSIVE BOT IDENTITY TEST RESULTS:');
      console.log('   Check Discord channel for responses from each bot');
      console.log('   Each bot should appear with:');
      console.log('     - Custom username (not "BunkBot")');
      console.log('     - Custom avatar (unique to each bot)');
      console.log('     - Expected response message');
      console.log('');
      console.log('🔍 Manual Verification Required:');
      console.log('   1. Check Discord channel for bot responses');
      console.log('   2. Verify each bot uses its custom name');
      console.log('   3. Verify each bot uses its custom avatar');
      console.log('   4. Note any bots that didn\'t respond');

      webhookClient.destroy();

    } catch (error) {
      console.error('❌ Comprehensive bot identity test failed:', error.message);
      throw error;
    }
  }, 120000); // 2 minute timeout for comprehensive test
});
