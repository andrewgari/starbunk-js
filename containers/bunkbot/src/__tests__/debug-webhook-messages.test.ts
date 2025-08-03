/**
 * Debug Webhook Messages Test
 * 
 * Sends individual test messages with detailed logging to help debug
 * why not all messages are being sent and why there are no bot responses.
 */

import { WebhookClient } from 'discord.js';

describe('Debug Webhook Messages', () => {
  const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL || process.env.E2E_WEBHOOK_URL;
  
  beforeAll(() => {
    if (!webhookUrl) {
      console.log('❌ No webhook URL configured');
      return;
    }
    console.log('🔗 Using webhook URL (first 50 chars):', webhookUrl.substring(0, 50) + '...');
  });

  it('should send individual test messages with detailed logging', async () => {
    if (!webhookUrl) {
      console.log('⚠️ Skipping - no webhook URL');
      return;
    }

    const webhookClient = new WebhookClient({ url: webhookUrl });
    
    const testMessages = [
      { 
        content: '🧪 **DEBUG TEST 1** - Simple test message', 
        description: 'Basic connectivity test' 
      },
      { 
        content: 'blu?', 
        description: 'BlueBot trigger - should respond with "Did somebody say Blu?" as BlueBot' 
      },
      { 
        content: 'Hold', 
        description: 'HoldBot trigger - should respond with "Hold." as HoldBot' 
      },
      { 
        content: '69', 
        description: 'BunkBot trigger - should respond with "Nice." as BunkBot' 
      },
      { 
        content: 'sheesh', 
        description: 'Sheesh Bot trigger - should respond with "SHEEEESH" as Sheesh Bot' 
      }
    ];

    console.log(`📤 Sending ${testMessages.length} individual test messages...`);
    console.log('');

    for (let i = 0; i < testMessages.length; i++) {
      const testMsg = testMessages[i];
      
      try {
        console.log(`📨 Message ${i + 1}/${testMessages.length}:`);
        console.log(`   Content: "${testMsg.content}"`);
        console.log(`   Purpose: ${testMsg.description}`);
        
        const message = await webhookClient.send({
          content: testMsg.content,
          username: `E2E Debug User ${i + 1}`,
          avatarURL: `https://cdn.discordapp.com/embed/avatars/${i}.png`
        });
        
        console.log(`   ✅ Sent successfully - Message ID: ${message.id}`);
        console.log(`   📍 Channel: ${message.channel_id}`);
        
        // Wait 2 seconds between messages to avoid rate limits and allow bot processing
        if (i < testMessages.length - 1) {
          console.log(`   ⏳ Waiting 2 seconds before next message...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to send message ${i + 1}:`, error.message);
        throw error;
      }
    }
    
    webhookClient.destroy();
    
    console.log('');
    console.log('📋 **SUMMARY**:');
    console.log(`✅ Successfully sent ${testMessages.length} test messages to Discord`);
    console.log('');
    console.log('🔍 **WHAT TO CHECK IN DISCORD**:');
    console.log('1. Do you see all 5 messages in your test channel?');
    console.log('2. Did any bots respond to the trigger messages?');
    console.log('3. If bots responded, what names/avatars did they use?');
    console.log('');
    console.log('🤖 **EXPECTED BOT RESPONSES** (if BunkBot is running):');
    console.log('- BlueBot: "Did somebody say Blu?" with custom BlueBot identity');
    console.log('- HoldBot: "Hold." with custom HoldBot identity');  
    console.log('- BunkBot: "Nice." with custom BunkBot identity');
    console.log('- Sheesh Bot: "SHEEEESH" with custom Sheesh Bot identity');
    console.log('');
    console.log('❌ **IF NO BOT RESPONSES**:');
    console.log('- Production BunkBot is likely not running');
    console.log('- Check if BunkBot container/process is active');
    console.log('- Verify BunkBot has access to the test channel');
    console.log('- Check BunkBot logs for errors');
    
  }, 30000);

  it('should test a simple deterministic trigger', async () => {
    if (!webhookUrl) {
      console.log('⚠️ Skipping - no webhook URL');
      return;
    }

    console.log('🎯 **FOCUSED TEST**: Testing BlueBot trigger only');
    
    const webhookClient = new WebhookClient({ url: webhookUrl });
    
    try {
      console.log('📤 Sending BlueBot trigger: "blu?"');
      
      const message = await webhookClient.send({
        content: 'blu?',
        username: 'Focused Test User',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/3.png'
      });
      
      console.log(`✅ Message sent - ID: ${message.id}`);
      console.log('');
      console.log('⏳ **WAIT 10 SECONDS** then check Discord for:');
      console.log('1. Your trigger message: "blu?"');
      console.log('2. Expected bot response: "Did somebody say Blu?"');
      console.log('3. Bot identity: Should appear as "BlueBot" (NOT "CovaBot")');
      console.log('4. Custom avatar: Should use blue-themed avatar via webhook');
      console.log('');
      console.log('If you see NO bot response after 10 seconds:');
      console.log('❌ Production BunkBot is not running or not processing messages');
      
      // Wait 10 seconds to give bot time to respond
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('⏰ 10 seconds elapsed - check Discord now!');
      
    } catch (error) {
      console.error('❌ Failed to send focused test:', error.message);
      throw error;
    } finally {
      webhookClient.destroy();
    }
  }, 20000);
});
