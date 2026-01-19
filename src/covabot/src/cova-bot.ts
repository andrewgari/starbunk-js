/**
 * CovaBot v2 - Main Orchestrator
 *
 * Manages multi-persona Discord bot with persistent memory,
 * YAML-based personality configuration, and hybrid response logic.
 */

import { Client, Events, Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { DatabaseService } from '@/services/database-service';
import { MemoryService } from '@/services/memory-service';
import { InterestService } from '@/services/interest-service';
import { SocialBatteryService } from '@/services/social-battery-service';
import { ResponseDecisionService } from '@/services/response-decision-service';
import { LlmService } from '@/services/llm-service';
import { PersonalityService } from '@/services/personality-service';
import { MessageHandler } from '@/handlers/message-handler';
import { CovaProfile } from '@/models/memory-types';
import { loadPersonalitiesFromDirectory, getDefaultPersonalitiesPath } from '@/serialization/personality-parser';

const logger = logLayer.withPrefix('CovaBot');

export interface CovaBotConfig {
  discordToken: string;
  personalitiesPath?: string;
  databasePath?: string;
  // LLM Provider configuration (priority: Ollama > Gemini > OpenAI)
  ollamaApiUrl?: string;
  ollamaDefaultModel?: string;
  geminiApiKey?: string;
  geminiDefaultModel?: string;
  openaiApiKey?: string;
  openaiDefaultModel?: string;
}

export class CovaBot {
  private static instance: CovaBot | null = null;

  private config: CovaBotConfig;
  private client: Client | null = null;
  private profiles: Map<string, CovaProfile> = new Map();

  // Services
  private dbService: DatabaseService | null = null;
  private memoryService: MemoryService | null = null;
  private interestService: InterestService | null = null;
  private socialBatteryService: SocialBatteryService | null = null;
  private responseDecisionService: ResponseDecisionService | null = null;
  private llmService: LlmService | null = null;
  private personalityService: PersonalityService | null = null;
  private messageHandler: MessageHandler | null = null;

  private constructor(config: CovaBotConfig) {
    this.config = config;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: CovaBotConfig): CovaBot {
    if (!CovaBot.instance) {
      if (!config) {
        throw new Error('CovaBot config required for first initialization');
      }
      CovaBot.instance = new CovaBot(config);
    }
    return CovaBot.instance;
  }

  /**
   * Initialize and start the bot
   */
  async start(): Promise<void> {
    logger.info('Starting CovaBot v2');

    try {
      // Initialize database
      await this.initializeDatabase();

      // Load personality profiles
      await this.loadProfiles();

      // Initialize services
      await this.initializeServices();

      // Initialize Discord client
      await this.initializeDiscord();

      logger.withMetadata({
        profiles_loaded: this.profiles.size
      }).info('CovaBot v2 started successfully');
    } catch (error) {
      logger.withError(error).error('Failed to start CovaBot');
      throw error;
    }
  }

  /**
   * Stop the bot gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping CovaBot v2');

    if (this.client) {
      this.client.destroy();
      this.client = null;
    }

    if (this.dbService) {
      this.dbService.close();
    }

    logger.info('CovaBot v2 stopped');
  }

  /**
   * Get a loaded profile by ID
   */
  getProfile(profileId: string): CovaProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get all loaded profiles
   */
  getAllProfiles(): CovaProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get service instances (for testing/integration)
   */
  getServices() {
    return {
      db: this.dbService,
      memory: this.memoryService,
      interest: this.interestService,
      socialBattery: this.socialBatteryService,
      responseDecision: this.responseDecisionService,
      llm: this.llmService,
      personality: this.personalityService,
    };
  }

  /**
   * Initialize SQLite database
   */
  private async initializeDatabase(): Promise<void> {
    logger.info('Initializing database');

    this.dbService = DatabaseService.getInstance(this.config.databasePath);
    await this.dbService.initialize();
  }

  /**
   * Load personality profiles from YAML files
   */
  private async loadProfiles(): Promise<void> {
    const personalitiesPath = this.config.personalitiesPath || getDefaultPersonalitiesPath();
    logger.withMetadata({ path: personalitiesPath }).info('Loading personality profiles');

    const loadedProfiles = loadPersonalitiesFromDirectory(personalitiesPath);

    for (const profile of loadedProfiles) {
      if (this.profiles.has(profile.id)) {
        logger.withMetadata({ profile_id: profile.id }).warn('Duplicate profile ID, skipping');
        continue;
      }
      this.profiles.set(profile.id, profile);
    }

    if (this.profiles.size === 0) {
      logger.warn('No personality profiles loaded - bot will not respond to messages');
    }

    logger.withMetadata({ count: this.profiles.size }).info('Profiles loaded');
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    logger.info('Initializing services');

    const db = this.dbService!.getDb();

    // Core services
    this.memoryService = new MemoryService(db);
    this.interestService = new InterestService(db);
    this.socialBatteryService = new SocialBatteryService(db);
    this.llmService = new LlmService({
      ollamaApiUrl: this.config.ollamaApiUrl,
      ollamaDefaultModel: this.config.ollamaDefaultModel,
      geminiApiKey: this.config.geminiApiKey,
      geminiDefaultModel: this.config.geminiDefaultModel,
      openaiApiKey: this.config.openaiApiKey,
      openaiDefaultModel: this.config.openaiDefaultModel,
    });
    this.personalityService = new PersonalityService(db);

    // Initialize interests from profiles
    for (const profile of this.profiles.values()) {
      await this.interestService.initializeFromProfile(profile);
    }

    // Response decision orchestrator
    this.responseDecisionService = new ResponseDecisionService(
      this.interestService,
      this.socialBatteryService,
    );

    // Message handler
    this.messageHandler = new MessageHandler(
      this.profiles,
      this.memoryService,
      this.responseDecisionService,
      this.llmService,
      this.personalityService,
      this.socialBatteryService,
    );

    logger.info('Services initialized');
  }

  /**
   * Initialize Discord client
   */
  private async initializeDiscord(): Promise<void> {
    logger.info('Initializing Discord client');

    this.client = new Client({
      intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent',
        'GuildMembers',
      ],
    });

    // Set up shared Discord service
    const discordService = DiscordService.getInstance();

    this.client.once(Events.ClientReady, (readyClient) => {
      discordService.setClient(readyClient);
      logger.withMetadata({
        user: readyClient.user.tag,
        guilds: readyClient.guilds.cache.size,
      }).info('Discord client ready');
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      try {
        await this.messageHandler!.handleMessage(message);
      } catch (error) {
        logger.withError(error).withMetadata({
          message_id: message.id,
          channel_id: message.channelId,
        }).error('Error handling message');
      }
    });

    // Login
    await this.client.login(this.config.discordToken);
  }

  /**
   * Reset the singleton (for testing)
   */
  static resetInstance(): void {
    if (CovaBot.instance) {
      CovaBot.instance.stop();
      CovaBot.instance = null;
    }
  }
}
