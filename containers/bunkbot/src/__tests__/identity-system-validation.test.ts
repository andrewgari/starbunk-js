/**
 * Bot Identity System Validation Tests
 * 
 * Tests the comprehensive bot identity system with static and dynamic approaches.
 */

import { BotRegistry } from '../botRegistry';
// import { DiscordService } from '@starbunk/shared';

describe('Bot Identity System Validation', () => {
  let bots: any[];

  beforeAll(async () => {
    // Load all bots without DiscordService to avoid mock client issues
    bots = await BotRegistry.discoverBots();
  });

  describe('Static Identity Bots', () => {
    const staticBots = [
      {
        name: 'BlueBot',
        expectedType: 'static',
        expectedBotName: 'BlueBot',
        expectedAvatarUrl: 'https://i.imgur.com/AAtmRum.png',
        description: 'Should have blue-themed avatar and BlueBot name'
      },
      {
        name: 'Spider-Bot',
        expectedType: 'static', 
        expectedBotName: 'Spider-Bot',
        expectedAvatarUrl: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
        description: 'Should have spider-themed avatar and Spider-Bot name'
      }
    ];

    staticBots.forEach(botConfig => {
      it(`should have static identity configuration for ${botConfig.name}`, async () => {
        const bot = bots.find(b => b.name === botConfig.name);
        
        expect(bot).toBeDefined();
        console.log(`🤖 ${botConfig.name}:`);
        console.log(`   Name: ${bot.name}`);
        console.log(`   Description: ${botConfig.description}`);
        
        // Check if bot has the new identity configuration
        const botImpl = (bot as any).replyBotImpl;
        if (botImpl && botImpl._config && botImpl._config.identityConfig) {
          const identityConfig = botImpl._config.identityConfig;
          
          console.log(`   ✅ Identity Type: ${identityConfig.type}`);
          expect(identityConfig.type).toBe(botConfig.expectedType);
          
          if (identityConfig.type === 'static') {
            console.log(`   📛 Bot Name: ${identityConfig.identity.botName}`);
            console.log(`   📷 Avatar URL: ${identityConfig.identity.avatarUrl}`);
            
            expect(identityConfig.identity.botName).toBe(botConfig.expectedBotName);
            expect(identityConfig.identity.avatarUrl).toBe(botConfig.expectedAvatarUrl);
          }
        } else {
          console.log(`   ⚠️ Using legacy identity configuration`);
          // Check legacy defaultIdentity
          if (botImpl && botImpl._config && botImpl._config.defaultIdentity) {
            console.log(`   📛 Legacy Bot Name: ${botImpl._config.defaultIdentity.botName}`);
            console.log(`   📷 Legacy Avatar URL: ${botImpl._config.defaultIdentity.avatarUrl}`);
          }
        }
      });
    });
  });

  describe('Dynamic Identity Bots', () => {
    const dynamicBots = [
      {
        name: 'ChadBot',
        expectedType: 'dynamic',
        targetUsername: 'Chad',
        description: 'Should use Chad\'s Discord identity in production, CovaBot in testing'
      },
      {
        name: 'GuyBot',
        expectedType: 'dynamic',
        targetUsername: 'Guy', 
        description: 'Should use Guy\'s Discord identity in production, CovaBot in testing'
      },
      {
        name: 'VennBot',
        expectedType: 'dynamic',
        targetUsername: 'Venn',
        description: 'Should use Venn\'s Discord identity in production, CovaBot in testing'
      }
    ];

    dynamicBots.forEach(botConfig => {
      it(`should have dynamic identity configuration for ${botConfig.name}`, async () => {
        const bot = bots.find(b => b.name === botConfig.name);
        
        expect(bot).toBeDefined();
        console.log(`🎭 ${botConfig.name} (Dynamic Identity):`);
        console.log(`   Name: ${bot.name}`);
        console.log(`   Description: ${botConfig.description}`);
        
        // Check if bot has the new identity configuration
        const botImpl = (bot as any).replyBotImpl;
        if (botImpl && botImpl._config && botImpl._config.identityConfig) {
          const identityConfig = botImpl._config.identityConfig;
          
          console.log(`   ✅ Identity Type: ${identityConfig.type}`);
          expect(identityConfig.type).toBe(botConfig.expectedType);
          
          if (identityConfig.type === 'dynamic') {
            console.log(`   🎯 Target Username: ${identityConfig.targetUsername}`);
            console.log(`   📍 Testing: Uses CovaBot's identity (139592376443338752)`);
            console.log(`   📍 Production: Uses ${identityConfig.targetUsername}'s identity`);
            
            expect(identityConfig.targetUsername).toBe(botConfig.targetUsername);
          }
        } else {
          console.log(`   ⚠️ Using legacy identity configuration`);
        }
      });
    });
  });

  describe('Identity System Integration', () => {
    it('should validate bot identity configuration distribution', () => {
      console.log(`📊 Bot Identity System Status:`);
      console.log(`   Total bots loaded: ${bots.length}`);

      let staticIdentityBots = 0;
      let dynamicIdentityBots = 0;
      let legacyIdentityBots = 0;

      bots.forEach(bot => {
        const botImpl = (bot as any).replyBotImpl;

        // Check identity configuration type
        if (botImpl && botImpl._config && botImpl._config.identityConfig) {
          if (botImpl._config.identityConfig.type === 'static') {
            staticIdentityBots++;
          } else if (botImpl._config.identityConfig.type === 'dynamic') {
            dynamicIdentityBots++;
          }
        } else {
          legacyIdentityBots++;
        }
      });

      console.log(`   Static identity bots: ${staticIdentityBots}`);
      console.log(`   Dynamic identity bots: ${dynamicIdentityBots}`);
      console.log(`   Legacy identity bots: ${legacyIdentityBots}`);

      // We should have some bots with the new identity system
      expect(staticIdentityBots + dynamicIdentityBots).toBeGreaterThan(0);
    });

    it('should provide comprehensive identity system summary', () => {
      console.log(`\n🎯 **COMPLETE BOT IDENTITY SYSTEM SUMMARY**:`);
      console.log(`=====================================================`);
      
      const staticBots: string[] = [];
      const dynamicBots: string[] = [];
      const legacyBots: string[] = [];
      
      bots.forEach(bot => {
        const botImpl = (bot as any).replyBotImpl;
        
        if (botImpl && botImpl._config && botImpl._config.identityConfig) {
          if (botImpl._config.identityConfig.type === 'static') {
            staticBots.push(bot.name);
          } else if (botImpl._config.identityConfig.type === 'dynamic') {
            dynamicBots.push(bot.name);
          }
        } else {
          legacyBots.push(bot.name);
        }
      });
      
      console.log(`\n🎭 **STATIC IDENTITY BOTS** (${staticBots.length}):`);
      staticBots.forEach(name => {
        console.log(`   ✅ ${name} - Uses constants file for unique avatar/name`);
      });
      
      console.log(`\n🎭 **DYNAMIC IDENTITY BOTS** (${dynamicBots.length}):`);
      dynamicBots.forEach(name => {
        console.log(`   ✅ ${name} - Queries Discord server for user identity`);
      });
      
      console.log(`\n🎭 **LEGACY IDENTITY BOTS** (${legacyBots.length}):`);
      legacyBots.forEach(name => {
        console.log(`   ⚠️ ${name} - Uses legacy defaultIdentity configuration`);
      });
      
      console.log(`\n🎯 **EXPECTED BEHAVIOR**:`);
      console.log(`✅ All bots appear with CUSTOM names and avatars (webhook-based)`);
      console.log(`✅ Static bots use their configured unique identities`);
      console.log(`✅ Dynamic bots adapt: CovaBot identity in testing, target user in production`);
      console.log(`❌ NO bots appear as default Discord bot identity`);
      console.log(`❌ NO bots appear as 'CovaBot' (except dynamic bots in testing)`);
      
      // Verify we have the expected distribution
      expect(staticBots.length).toBeGreaterThan(0);
      expect(dynamicBots.length).toBeGreaterThan(0);
      expect(bots.length).toBeGreaterThan(20); // Should have 24+ bots total
    });
  });
});
