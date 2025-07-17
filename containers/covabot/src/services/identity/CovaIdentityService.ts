// CovaBot Identity Service - Manages server-specific personalities and identities
import { Guild, GuildMember } from 'discord.js';
import { logger } from '@starbunk/shared';
import { 
  ServerIdentity, 
  PersonalityProfile, 
  IdentityError,
  CovaBotConfig 
} from '../../types';
import { DEFAULT_PERSONALITIES } from '../../config';

/**
 * Service for managing CovaBot's identity and personality across different Discord servers
 */
export class CovaIdentityService {
  private identityCache = new Map<string, ServerIdentity>();
  private personalityCache = new Map<string, PersonalityProfile>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  constructor(private config: CovaBotConfig) {
    this.initializeDefaultPersonalities();
  }

  /**
   * Initialize default personality profiles
   */
  private initializeDefaultPersonalities(): void {
    Object.entries(DEFAULT_PERSONALITIES).forEach(([key, personality]) => {
      const profile: PersonalityProfile = {
        id: `default_${key}`,
        ...personality,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.personalityCache.set(profile.id, profile);
    });

    logger.info('✅ Default personalities initialized', {
      count: Object.keys(DEFAULT_PERSONALITIES).length
    });
  }

  /**
   * Get or create server-specific identity for CovaBot
   */
  async getServerIdentity(serverId: string): Promise<ServerIdentity> {
    try {
      // Check cache first
      const cached = this.identityCache.get(serverId);
      if (cached && this.isCacheValid(cached.updatedAt)) {
        return cached;
      }

      // Try to load from database
      let identity = await this.loadServerIdentityFromDB(serverId);
      
      if (!identity) {
        // Create new identity for server
        identity = await this.createServerIdentity(serverId);
      }

      // Cache the identity
      this.identityCache.set(serverId, identity);
      return identity;

    } catch (error) {
      logger.error('Failed to get server identity:', error);
      throw new IdentityError(`Failed to get server identity for ${serverId}`, error);
    }
  }

  /**
   * Create a new server identity with default personality
   */
  private async createServerIdentity(serverId: string): Promise<ServerIdentity> {
    const defaultPersonality = this.personalityCache.get('default_friendly');
    if (!defaultPersonality) {
      throw new IdentityError('Default personality not found');
    }

    const identity: ServerIdentity = {
      id: `identity_${serverId}`,
      serverId,
      nickname: 'CovaBot',
      personality: defaultPersonality,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await this.saveServerIdentityToDB(identity);

    logger.info('✅ Created new server identity', {
      serverId,
      nickname: identity.nickname,
      personality: identity.personality.name
    });

    return identity;
  }

  /**
   * Update server identity (nickname, avatar, personality)
   */
  async updateServerIdentity(
    serverId: string, 
    updates: Partial<Pick<ServerIdentity, 'nickname' | 'avatarUrl' | 'personality'>>
  ): Promise<ServerIdentity> {
    try {
      const identity = await this.getServerIdentity(serverId);
      
      const updatedIdentity: ServerIdentity = {
        ...identity,
        ...updates,
        updatedAt: new Date()
      };

      // Save to database
      await this.saveServerIdentityToDB(updatedIdentity);

      // Update cache
      this.identityCache.set(serverId, updatedIdentity);

      logger.info('✅ Updated server identity', {
        serverId,
        updates: Object.keys(updates)
      });

      return updatedIdentity;

    } catch (error) {
      logger.error('Failed to update server identity:', error);
      throw new IdentityError(`Failed to update server identity for ${serverId}`, error);
    }
  }

  /**
   * Apply identity to Discord guild member (bot)
   */
  async applyIdentityToGuild(guild: Guild, botMember: GuildMember): Promise<void> {
    try {
      const identity = await this.getServerIdentity(guild.id);

      // Update nickname if different
      if (botMember.nickname !== identity.nickname) {
        await botMember.setNickname(identity.nickname);
        logger.info('✅ Updated bot nickname', {
          serverId: guild.id,
          oldNickname: botMember.nickname,
          newNickname: identity.nickname
        });
      }

      // Update avatar if provided and different
      if (identity.avatarUrl && botMember.user.avatarURL() !== identity.avatarUrl) {
        // Note: Bot avatar is global, not per-server
        // This would require a different approach for per-server avatars
        logger.info('📝 Avatar update requested (global setting)', {
          serverId: guild.id,
          avatarUrl: identity.avatarUrl
        });
      }

    } catch (error) {
      logger.error('Failed to apply identity to guild:', error);
      throw new IdentityError(`Failed to apply identity to guild ${guild.id}`, error);
    }
  }

  /**
   * Get personality profile by ID
   */
  getPersonalityProfile(personalityId: string): PersonalityProfile | null {
    return this.personalityCache.get(personalityId) || null;
  }

  /**
   * Create custom personality profile
   */
  async createPersonalityProfile(personality: Omit<PersonalityProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonalityProfile> {
    const profile: PersonalityProfile = {
      id: `custom_${Date.now()}`,
      ...personality,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await this.savePersonalityToDB(profile);

    // Cache the personality
    this.personalityCache.set(profile.id, profile);

    logger.info('✅ Created custom personality profile', {
      id: profile.id,
      name: profile.name
    });

    return profile;
  }

  /**
   * Get all available personality profiles
   */
  getAllPersonalities(): PersonalityProfile[] {
    return Array.from(this.personalityCache.values());
  }

  /**
   * Check if identity should respond to a message based on trigger patterns
   */
  shouldRespond(message: string, identity: ServerIdentity): boolean {
    const lowerMessage = message.toLowerCase();
    
    return identity.personality.triggerPatterns.some(pattern => 
      lowerMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Get contextual behavior for a given context
   */
  getContextualBehavior(context: string, identity: ServerIdentity): string | null {
    const behavior = identity.personality.contextualBehaviors
      .filter(cb => cb.context === context)
      .sort((a, b) => b.priority - a.priority)[0];

    return behavior?.behavior || null;
  }

  /**
   * Clear identity cache for a server
   */
  clearServerCache(serverId: string): void {
    this.identityCache.delete(serverId);
    logger.info('🗑️ Cleared identity cache', { serverId });
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.identityCache.clear();
    logger.info('🗑️ Cleared all identity caches');
  }

  // Private helper methods

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.cacheExpiry;
  }

  private async loadServerIdentityFromDB(serverId: string): Promise<ServerIdentity | null> {
    // TODO: Implement database loading
    // This would query the database for existing server identity
    // For now, return null to create new identity
    return null;
  }

  private async saveServerIdentityToDB(identity: ServerIdentity): Promise<void> {
    // TODO: Implement database saving
    // This would save the identity to the database
    logger.debug('💾 Saving server identity to database', {
      serverId: identity.serverId,
      nickname: identity.nickname
    });
  }

  private async savePersonalityToDB(personality: PersonalityProfile): Promise<void> {
    // TODO: Implement database saving
    // This would save the personality profile to the database
    logger.debug('💾 Saving personality profile to database', {
      id: personality.id,
      name: personality.name
    });
  }

  /**
   * Get identity statistics
   */
  getStats(): {
    cachedIdentities: number;
    cachedPersonalities: number;
    defaultPersonalities: number;
  } {
    return {
      cachedIdentities: this.identityCache.size,
      cachedPersonalities: this.personalityCache.size,
      defaultPersonalities: Object.keys(DEFAULT_PERSONALITIES).length
    };
  }

  /**
   * Health check for the identity service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        details: {
          ...stats,
          cacheExpiry: this.cacheExpiry,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
