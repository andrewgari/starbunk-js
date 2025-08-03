/**
 * Simple Webhook Test
 * 
 * Tests that the webhook URL works and can send messages to Discord
 * without requiring a Discord monitoring client.
 */

import { WebhookClient } from 'discord.js';

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
});
