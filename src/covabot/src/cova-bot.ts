/**
 * CovaBot v2 - Main Orchestrator
 *
 * Manages multi-persona Discord bot with persistent memory,
 * YAML-based personality configuration, and hybrid response logic.
 */

import { Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { setApplicationHealth } from '@starbunk/shared/observability/health-server';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { PostgresService } from '@starbunk/shared/database';
import { initializeDatabase } from '@/database';
import { MemoryService } from '@/services/memory-service';
import { InterestService } from '@/services/interest-service';
import { SocialBatteryService } from '@/services/social-battery-service';
import { ResponseDecisionService } from '@/services/response-decision-service';
import { LlmService } from '@/services/llm-service';
import { PersonalityService } from '@/services/personality-service';
import { MessageHandler } from '@/handlers/message-handler';
import { ConversationRepository } from '@/repositories/conversation-repository';
import { UserFactRepository } from '@/repositories/user-fact-repository';
import { SocialBatteryRepository } from '@/repositories/social-battery-repository';
import { InterestRepository } from '@/repositories/interest-repository';
import { PersonalityRepository } from '@/repositories/personality-repository';
import { CovaProfile } from '@/models/memory-types';
import {
  loadPersonalitiesFromDirectory,
  getDefaultPersonalitiesPath,
} from '@/serialization/personality-parser';
import { EmbeddingManager } from '@/services/llm';
import { VERBOSE_LOGGING } from '@/utils/verbose-mode';

const logger = logLayer.withPrefix('CovaBot');

export interface CovaBotConfig {
  discordToken: string;
  personalitiesPath?: string;
  databasePath?: string;
  // Ollama (local, no API key)
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;
  // Anthropic / Claude
  anthropicApiKey?: string;
  anthropicDefaultModel?: string;
  // Google Gemini
  geminiApiKey?: string;
  geminiDefaultModel?: string;
  // OpenAI
  openaiApiKey?: string;
  openaiDefaultModel?: string;
  // Legacy aliases
  localLlmApiKey?: string;
  localLlmDefaultModel?: string;
  cloudLlmApiKey?: string;
  cloudLlmDefaultModel?: string;
}

export class CovaBot {
  private static instance: CovaBot | null = null;

  private config: CovaBotConfig;
  private client: Client | null = null;
  private profiles: Map<string, CovaProfile> = new Map();

  // Services
  private pgService: PostgresService | null = null;
  private memoryService: MemoryService | null = null;
  private interestService: InterestService | null = null;
  private socialBatteryService: SocialBatteryService | null = null;
  private responseDecisionService: ResponseDecisionService | null = null;
  private llmService: LlmService | null = null;
  private personalityService: PersonalityService | null = null;
  private messageHandler: MessageHandler | null = null;
  private embeddingManager: EmbeddingManager | null = null;

  private constructor(config: CovaBotConfig) {
    this.config = config;
  }

  static getInstance(config?: CovaBotConfig): CovaBot {
    if (!CovaBot.instance) {
      if (!config) {
        throw new Error('CovaBot config required for first initialization');
      }
      CovaBot.instance = new CovaBot(config);
    }
    return CovaBot.instance;
  }

  async start(): Promise<void> {
    logger.info('Starting CovaBot v2');

    try {
      await this.initializeDatabase();
      await this.loadProfiles();
      await this.initializeServices();
      await this.initializeDiscord();

      logger
        .withMetadata({ profiles_loaded: this.profiles.size })
        .info('CovaBot v2 started successfully');
    } catch (error) {
      logger.withError(error).error('Failed to start CovaBot');
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping CovaBot v2');

    if (this.embeddingManager) {
      this.embeddingManager.stopScheduledUpdates();
    }

    if (this.client) {
      this.client.destroy();
      this.client = null;
    }

    if (this.pgService) {
      await this.pgService.close();
      this.pgService = null;
    }

    logger.info('CovaBot v2 stopped');
  }

  getProfile(profileId: string): CovaProfile | undefined {
    return this.profiles.get(profileId);
  }

  getAllProfiles(): CovaProfile[] {
    return Array.from(this.profiles.values());
  }

  getServices(): {
    db: PostgresService | null;
    memory: MemoryService | null;
    interest: InterestService | null;
    socialBattery: SocialBatteryService | null;
    responseDecision: ResponseDecisionService | null;
    llm: LlmService | null;
    personality: PersonalityService | null;
    embedding: EmbeddingManager | null;
  } {
    return {
      db: this.pgService,
      memory: this.memoryService,
      interest: this.interestService,
      socialBattery: this.socialBatteryService,
      responseDecision: this.responseDecisionService,
      llm: this.llmService,
      personality: this.personalityService,
      embedding: this.embeddingManager,
    };
  }

  private async initializeDatabase(): Promise<void> {
    this.pgService = await initializeDatabase();
  }

  private async loadProfiles(): Promise<void> {
    const personalitiesPath = this.config.personalitiesPath || getDefaultPersonalitiesPath();
    const profiles = loadPersonalitiesFromDirectory(personalitiesPath);
    this.profiles = new Map(profiles.map(profile => [profile.id, profile]));

    logger
      .withMetadata({ count: this.profiles.size, path: personalitiesPath })
      .info('Profiles loaded');

    // Always audit personality data completeness — warns on startup if data is missing
    for (const profile of this.profiles.values()) {
      const issues: string[] = [];

      if (
        !profile.personality.systemPrompt ||
        profile.personality.systemPrompt.trim().length < 50
      ) {
        issues.push(
          `system_prompt too short or missing (${profile.personality.systemPrompt.length} chars)`,
        );
      }
      if (profile.personality.traits.length === 0) {
        issues.push('no traits defined');
      }
      if (profile.personality.topicAffinities.length === 0) {
        issues.push('no topic_affinities defined');
      }
      if (profile.nameAliases.length === 0) {
        issues.push('no name_aliases — bot will never detect name mentions');
      }

      if (issues.length > 0) {
        logger
          .withMetadata({
            profile_id: profile.id,
            display_name: profile.displayName,
            issues,
          })
          .warn('Personality data incomplete');
      } else if (VERBOSE_LOGGING) {
        logger
          .withMetadata({
            profile_id: profile.id,
            display_name: profile.displayName,
            system_prompt_length: profile.personality.systemPrompt.length,
            traits: profile.personality.traits,
            topic_affinities: profile.personality.topicAffinities,
            background_facts_count: profile.personality.backgroundFacts.length,
            name_aliases: profile.nameAliases,
            social_battery: profile.socialBattery,
            llm_model: profile.llmConfig.model,
          })
          .info('Personality loaded OK');
      }
    }

    if (VERBOSE_LOGGING) {
      logger
        .withMetadata({ verbose: true, log_prompts: process.env.COVABOT_LOG_PROMPTS === 'true' })
        .info('COVABOT_VERBOSE=true — decision logging enabled at INFO level');
    }
  }

  private async initializeServices(): Promise<void> {
    logger.info('Initializing services');

    if (!this.pgService) {
      throw new Error('PostgreSQL not initialized');
    }

    const conversationRepo = new ConversationRepository(this.pgService);
    const userFactRepo = new UserFactRepository(this.pgService);
    const socialBatteryRepo = new SocialBatteryRepository(this.pgService);
    const interestRepo = new InterestRepository(this.pgService);
    const personalityRepo = new PersonalityRepository(this.pgService);

    this.memoryService = new MemoryService(conversationRepo, userFactRepo);
    this.interestService = new InterestService(interestRepo);
    this.socialBatteryService = new SocialBatteryService(socialBatteryRepo);
    this.llmService = new LlmService({
      ollamaBaseUrl: this.config.ollamaBaseUrl,
      ollamaDefaultModel: this.config.ollamaDefaultModel,
      anthropicApiKey: this.config.anthropicApiKey,
      anthropicDefaultModel: this.config.anthropicDefaultModel,
      geminiApiKey: this.config.geminiApiKey,
      geminiDefaultModel: this.config.geminiDefaultModel,
      openaiApiKey: this.config.openaiApiKey,
      openaiDefaultModel: this.config.openaiDefaultModel,
      localLlmApiKey: this.config.localLlmApiKey,
      localLlmDefaultModel: this.config.localLlmDefaultModel,
      cloudLlmApiKey: this.config.cloudLlmApiKey,
      cloudLlmDefaultModel: this.config.cloudLlmDefaultModel,
    });
    this.personalityService = new PersonalityService(personalityRepo);

    this.embeddingManager = new EmbeddingManager({
      localLlmApiKey: this.config.localLlmApiKey,
      localLlmEmbeddingModel: process.env.LOCAL_LLM_EMBEDDING_MODEL,
      cloudLlmApiKey: this.config.cloudLlmApiKey,
      cloudLlmEmbeddingModel: process.env.CLOUD_LLM_EMBEDDING_MODEL,
    });

    const chatModel = this.config.localLlmDefaultModel || process.env.LOCAL_LLM_DEFAULT_MODEL;
    const additionalModels = chatModel ? [chatModel] : [];
    this.embeddingManager.startScheduledUpdates(additionalModels);

    this.responseDecisionService = new ResponseDecisionService(this.socialBatteryService);

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

  private async initializeDiscord(): Promise<void> {
    logger.info('Initializing Discord client');

    if (!this.messageHandler) {
      throw new Error('Message handler not initialized');
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    DiscordService.getInstance().setClient(this.client);

    this.client.once(Events.ClientReady, readyClient => {
      logger
        .withMetadata({
          user_tag: readyClient.user.tag,
          guild_count: readyClient.guilds.cache.size,
        })
        .info('Discord client ready');
    });

    // Prevent uncaught exceptions from gateway/network errors
    this.client.on(Events.Error, error => {
      logger.withError(error).error('Discord client error');
    });

    this.client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
      logger
        .withMetadata({ code: closeEvent.code, reason: closeEvent.reason, shard_id: shardId })
        .warn('Discord shard disconnected');
      setApplicationHealth('unhealthy', `Discord disconnected (code ${closeEvent.code})`);
    });

    this.client.on(Events.ShardReconnecting, shardId => {
      logger.withMetadata({ shard_id: shardId }).info('Discord shard reconnecting');
    });

    this.client.on(Events.ShardResume, (shardId, replayedEvents) => {
      logger
        .withMetadata({ shard_id: shardId, replayed_events: replayedEvents })
        .info('Discord shard resumed');
      setApplicationHealth('healthy');
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) {
        return;
      }

      try {
        await this.messageHandler!.handleMessage(message);
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({
            message_id: message.id,
            channel_id: message.channelId,
          })
          .error('Error handling message');
      }
    });

    await this.client.login(this.config.discordToken);
  }

  /** Test-only: stop the singleton and clear it so tests can create a fresh instance. */
  static async resetInstance(): Promise<void> {
    if (CovaBot.instance) {
      await CovaBot.instance.stop();
      CovaBot.instance = null;
    }
  }
}
