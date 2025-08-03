/**
 * Simple Bot List Test
 * 
 * Lists all loaded bots to understand the current bot names and configurations.
 */

import { BotRegistry } from '../botRegistry';

describe('Simple Bot List', () => {
  let bots: any[];

  beforeAll(async () => {
    // Load all bots
    bots = await BotRegistry.discoverBots();
  });

  it('should list all loaded bots with their configurations', () => {
    console.log(`\n📋 **ALL LOADED BOTS** (${bots.length} total):`);
    console.log(`===============================================`);
    
    bots.forEach((bot, index) => {
      console.log(`\n${index + 1}. **${bot.name}**`);
      
      const botImpl = (bot as any).replyBotImpl;
      if (botImpl && botImpl._config) {
        const config = botImpl._config;
        
        console.log(`   Description: ${config.description || 'No description'}`);
        
        // Check identity configuration
        if (config.identityConfig) {
          console.log(`   ✅ New Identity Config: ${config.identityConfig.type}`);
          if (config.identityConfig.type === 'static') {
            console.log(`      Bot Name: ${config.identityConfig.identity.botName}`);
            console.log(`      Avatar URL: ${config.identityConfig.identity.avatarUrl}`);
          } else if (config.identityConfig.type === 'dynamic') {
            console.log(`      Target Username: ${config.identityConfig.targetUsername}`);
          }
        } else if (config.defaultIdentity) {
          console.log(`   ⚠️ Legacy Identity Config:`);
          console.log(`      Bot Name: ${config.defaultIdentity.botName}`);
          console.log(`      Avatar URL: ${config.defaultIdentity.avatarUrl}`);
        } else {
          console.log(`   ❌ No identity configuration found`);
        }
        
        // Check for DiscordService
        if (config.discordService) {
          console.log(`   🎭 DiscordService: Available`);
        } else {
          console.log(`   🎭 DiscordService: Not available`);
        }
      } else {
        console.log(`   ❌ No bot implementation config found`);
      }
    });
    
    console.log(`\n🎯 **SUMMARY**:`);
    console.log(`Total bots loaded: ${bots.length}`);
    
    // Count identity types
    let staticBots = 0;
    let dynamicBots = 0;
    let legacyBots = 0;
    
    bots.forEach(bot => {
      const botImpl = (bot as any).replyBotImpl;
      if (botImpl && botImpl._config && botImpl._config.identityConfig) {
        if (botImpl._config.identityConfig.type === 'static') {
          staticBots++;
        } else if (botImpl._config.identityConfig.type === 'dynamic') {
          dynamicBots++;
        }
      } else {
        legacyBots++;
      }
    });
    
    console.log(`Static identity bots: ${staticBots}`);
    console.log(`Dynamic identity bots: ${dynamicBots}`);
    console.log(`Legacy identity bots: ${legacyBots}`);
    
    expect(bots.length).toBeGreaterThan(0);
  });
});
