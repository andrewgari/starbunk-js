import { Client } from 'discord.js';

import { VoiceBot } from '../bots/voiceBot';
import { Command } from '../command';
import { AudioConfig, AudioService } from './audioService';
import { BotRegistry } from './botRegistry';
import { CommandRegistry } from './commandRegistry';
import { FileLoader } from './fileLoader';
import { InteractionHandler } from './interactionHandler';
import { MessageProcessor } from './messageProcessor';
import { MessageSyncConfig, MessageSyncService } from './messageSyncService';
import { VoiceStateManager } from './voiceStateManager';
import { WebhookConfig, WebhookService } from './webhookService';

export interface ServiceConfig {
  audio: AudioConfig;
  webhook: WebhookConfig;
  messageSync: MessageSyncConfig;
  basePath: string;
}

export class ServiceContainer {
  readonly audioService: AudioService;
  readonly botRegistry: BotRegistry<VoiceBot>;
  readonly commandRegistry: CommandRegistry;
  readonly fileLoader: FileLoader;
  readonly interactionHandler: InteractionHandler;
  readonly messageProcessor: MessageProcessor;
  readonly messageSyncService: MessageSyncService;
  readonly webhookService: WebhookService;
  readonly voiceStateManager: VoiceStateManager;

  constructor(client: Client, config: ServiceConfig) {
    this.fileLoader = new FileLoader(config.basePath);

    this.webhookService = new WebhookService(config.webhook, client);
    this.botRegistry = new BotRegistry();
    this.commandRegistry = new CommandRegistry();

    this.audioService = new AudioService(config.audio);
    this.messageSyncService = new MessageSyncService(
      config.messageSync,
      this.webhookService
    );

    this.messageProcessor = new MessageProcessor([]);
    this.interactionHandler = new InteractionHandler(this.commandRegistry);
    this.voiceStateManager = new VoiceStateManager(this.botRegistry);
  }

  async initialize(): Promise<void> {
    // Load and register commands
    const commandResult = await this.fileLoader.loadFiles(
      'commands',
      (module): module is Command => {
        return (
          module !== null &&
          typeof module === 'object' &&
          'data' in module &&
          'execute' in module
        );
      }
    );

    if (commandResult.isSuccess()) {
      for (const command of commandResult.value) {
        await this.commandRegistry.registerCommand(command);
      }
    }

    // Load and register bots
    const botResult = await this.fileLoader.loadFiles(
      'bots',
      (module): module is VoiceBot => {
        return (
          module !== null &&
          typeof module === 'object' &&
          'handleEvent' in module &&
          'getBotName' in module
        );
      }
    );

    if (botResult.isSuccess()) {
      for (const bot of botResult.value) {
        await this.botRegistry.registerBot(bot);
      }
    }
  }
}
