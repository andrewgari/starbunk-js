/**
 * CovaBot v2 - Main Orchestrator
 *
 * Manages multi-persona Discord bot with persistent memory,
 * YAML-based personality configuration, and hybrid response logic.
 */

import { Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { DatabaseService } from '@starbunk/shared/database';
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
import { CovaProfile } from '@/models/memory-types';
import { loadPersonalitiesFromDirectory, getDefaultPersonalitiesPath } from '@/serialization/personality-parser';
import { EmbeddingManager } from '@/services/llm';

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

if (this.dbService) {
this.dbService.close();
this.dbService = null;
}

logger.info('CovaBot v2 stopped');
}

getProfile(profileId: string): CovaProfile | undefined {
return this.profiles.get(profileId);
}

getAllProfiles(): CovaProfile[] {
return Array.from(this.profiles.values());
}

getServices() {
return {
db: this.dbService,
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
this.dbService = DatabaseService.getInstance(this.config.databasePath);
await this.dbService.initialize();
}

private async loadProfiles(): Promise<void> {
const personalitiesPath = this.config.personalitiesPath || getDefaultPersonalitiesPath();
const profiles = loadPersonalitiesFromDirectory(personalitiesPath);
this.profiles = new Map(profiles.map((profile) => [profile.id, profile]));

logger.withMetadata({ count: this.profiles.size, path: personalitiesPath }).info('Profiles loaded');
}

private async initializeServices(): Promise<void> {
logger.info('Initializing services');

if (!this.dbService) {
throw new Error('Database not initialized');
}

const db = this.dbService.getDb();

const conversationRepo = new ConversationRepository(db);
const userFactRepo = new UserFactRepository(db);
const socialBatteryRepo = new SocialBatteryRepository(db);
const interestRepo = new InterestRepository(db);

this.memoryService = new MemoryService(conversationRepo, userFactRepo);
this.interestService = new InterestService(interestRepo);
this.socialBatteryService = new SocialBatteryService(socialBatteryRepo);
this.llmService = new LlmService({
ollamaApiUrl: this.config.ollamaApiUrl,
ollamaDefaultModel: this.config.ollamaDefaultModel,
geminiApiKey: this.config.geminiApiKey,
geminiDefaultModel: this.config.geminiDefaultModel,
openaiApiKey: this.config.openaiApiKey,
openaiDefaultModel: this.config.openaiDefaultModel,
});
this.personalityService = new PersonalityService(db);

this.embeddingManager = new EmbeddingManager({
ollamaApiUrl: this.config.ollamaApiUrl,
ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL,
openaiApiKey: this.config.openaiApiKey,
openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL,
});

const chatModel = this.config.ollamaDefaultModel || process.env.OLLAMA_DEFAULT_MODEL;
const additionalModels = chatModel ? [chatModel] : [];
this.embeddingManager.startScheduledUpdates(additionalModels);

for (const profile of this.profiles.values()) {
await this.interestService.initializeFromProfile(profile);
}

this.responseDecisionService = new ResponseDecisionService(this.interestService, this.socialBatteryService);

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

this.client.once(Events.ClientReady, (readyClient) => {
logger.withMetadata({ user_tag: readyClient.user.tag }).info('Discord client ready');
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

static async resetInstance(): Promise<void> {
if (CovaBot.instance) {
await CovaBot.instance.stop();
CovaBot.instance = null;
}
}
}
