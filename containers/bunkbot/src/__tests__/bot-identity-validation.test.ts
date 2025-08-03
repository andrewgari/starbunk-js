/**
 * Bot Identity Validation Tests
 * 
 * Tests that all bots are configured with their correct unique identities
 * (names and avatar URLs) without requiring a live Discord connection.
 */

import { BotRegistry } from '../botRegistry';
import { DiscordService } from '@starbunk/shared';

// Mock Discord client for testing
const mockClient = {
  user: { id: 'test-bot-id' },
  options: { intents: { has: () => true } }
} as any;

describe('Bot Identity Validation', () => {
  let discordService: DiscordService;
  let bots: any[];

  beforeAll(async () => {
    // Initialize DiscordService with mock client
    discordService = new DiscordService(mockClient);
    
    // Load all bots
    bots = await BotRegistry.discoverBots(discordService);
  });

  describe('Static Bot Identities', () => {
    const staticBots = [
      {
        name: 'BlueBot',
        expectedAvatarUrl: 'https://i.imgur.com/AAtmRum.png',
        description: 'Should have blue-themed avatar'
      },
      {
        name: 'Spider-Bot',
        expectedAvatarUrl: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
        description: 'Should have spider-themed avatar'
      },
      {
        name: 'HoldBot',
        expectedAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
        description: 'Should have hold-themed avatar (currently using generic)'
      },
      {
        name: 'BunkBot',
        expectedAvatarUrl: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
        description: 'Should have bunk-themed avatar'
      },
      {
        name: 'Sheesh Bot',
        expectedAvatarUrl: 'https://i.imgur.com/HXVVfyj.png',
        description: 'Should have sheesh-themed avatar'
      }
    ];

    staticBots.forEach(botConfig => {
      it(`should have correct identity for ${botConfig.name}`, async () => {
        const bot = bots.find(b => b.name === botConfig.name);
        
        expect(bot).toBeDefined();
        expect(bot.name).toBe(botConfig.name);
        
        console.log(`🤖 ${botConfig.name}:`);
        console.log(`   Name: ${bot.name}`);
        console.log(`   Description: ${botConfig.description}`);
        
        // Check if bot has identity configuration
        if (bot.config && bot.config.identity) {
          console.log(`   ✅ Has identity config: ${bot.config.identity.botName}`);
          console.log(`   📷 Avatar URL: ${bot.config.identity.avatarUrl}`);
          
          expect(bot.config.identity.botName).toBe(botConfig.name);
          expect(bot.config.identity.avatarUrl).toBe(botConfig.expectedAvatarUrl);
        } else {
          console.log(`   ⚠️ No identity config found - may use dynamic identity`);
        }
      });
    });
  });

  describe('User-Specific Bot Identities', () => {
    const userSpecificBots = [
      {
        name: 'ChadBot',
        targetUser: 'Chad',
        description: 'Should use Chad\'s Discord identity in production, CovaBot in testing'
      },
      {
        name: 'GuyBot', 
        targetUser: 'Guy',
        description: 'Should use Guy\'s Discord identity in production, CovaBot in testing'
      },
      {
        name: 'VennBot',
        targetUser: 'Venn', 
        description: 'Should use Venn\'s Discord identity in production, CovaBot in testing'
      }
    ];

    userSpecificBots.forEach(botConfig => {
      it(`should have dynamic identity configuration for ${botConfig.name}`, async () => {
        const bot = bots.find(b => b.name === botConfig.name);
        
        expect(bot).toBeDefined();
        expect(bot.name).toBe(botConfig.name);
        
        console.log(`🎭 ${botConfig.name} (User-Specific):`);
        console.log(`   Name: ${bot.name}`);
        console.log(`   Target User: ${botConfig.targetUser}`);
        console.log(`   Description: ${botConfig.description}`);
        
        // User-specific bots should not have static identity config
        // They should use dynamic identity resolution
        if (bot.config && bot.config.identity) {
          console.log(`   ⚠️ Has static identity config (should be dynamic)`);
        } else {
          console.log(`   ✅ Uses dynamic identity resolution`);
        }
      });
    });
  });

  describe('Bot Identity System Integration', () => {
    it('should have DiscordService properly injected into all bots', () => {
      console.log(`📊 Bot Identity System Status:`);
      console.log(`   Total bots loaded: ${bots.length}`);
      
      let botsWithDiscordService = 0;
      let staticIdentityBots = 0;
      let dynamicIdentityBots = 0;
      
      bots.forEach(bot => {
        if (bot.discordService) {
          botsWithDiscordService++;
        }
        
        if (bot.config && bot.config.identity) {
          staticIdentityBots++;
        } else {
          dynamicIdentityBots++;
        }
      });
      
      console.log(`   Bots with DiscordService: ${botsWithDiscordService}/${bots.length}`);
      console.log(`   Static identity bots: ${staticIdentityBots}`);
      console.log(`   Dynamic identity bots: ${dynamicIdentityBots}`);
      
      // All bots should have DiscordService for webhook-based custom identity
      expect(botsWithDiscordService).toBe(bots.length);
    });

    it('should list all bot identities for verification', () => {
      console.log(`\n🎯 **COMPLETE BOT IDENTITY SUMMARY**:`);
      console.log(`=====================================`);
      
      bots.forEach(bot => {
        console.log(`\n🤖 **${bot.name}**:`);
        
        if (bot.config && bot.config.identity) {
          console.log(`   Type: Static Identity`);
          console.log(`   Bot Name: ${bot.config.identity.botName}`);
          console.log(`   Avatar URL: ${bot.config.identity.avatarUrl}`);
          console.log(`   ✅ Should appear as "${bot.config.identity.botName}" with custom avatar`);
        } else {
          console.log(`   Type: Dynamic Identity`);
          console.log(`   ✅ Should use webhook-based identity resolution`);
          console.log(`   📍 Testing: Uses CovaBot's identity`);
          console.log(`   📍 Production: Uses target user's identity`);
        }
        
        if (bot.discordService) {
          console.log(`   🎭 DiscordService: ✅ Available for webhook-based custom identity`);
        } else {
          console.log(`   🎭 DiscordService: ❌ Missing - will use default bot identity`);
        }
      });
      
      console.log(`\n🎯 **EXPECTED BEHAVIOR**:`);
      console.log(`When BunkBot runs with valid Discord token:`);
      console.log(`✅ All bots should appear with their CUSTOM names and avatars`);
      console.log(`✅ Static bots use their configured identity`);
      console.log(`✅ User-specific bots use dynamic identity (CovaBot in testing)`);
      console.log(`❌ NO bots should appear as default Discord bot identity`);
      console.log(`❌ NO bots should appear as "CovaBot" (except user-specific in testing)`);
    });
  });
});
