import {
  Client,
  ClientOptions,
  Events,
  Interaction,
  Message
} from 'discord.js';

import { ServiceConfig, ServiceContainer } from './services/serviceContainer';

export abstract class BaseClient extends Client {
  protected readonly services: ServiceContainer;
  protected readonly config: ServiceConfig;

  constructor(options: ClientOptions, config: ServiceConfig) {
    super(options);
    this.services = new ServiceContainer(this, config);
    this.config = config;
  }

  protected async setupEventHandlers(): Promise<void> {
    this.on(Events.MessageCreate, this.handleMessage.bind(this));
    this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
  }

  protected async handleMessage(message: Message): Promise<void> {
    await this.services.messageProcessor.processMessage(message);
  }

  protected async handleInteraction(interaction: Interaction): Promise<void> {
    const result = await this.services.interactionHandler.handleInteraction(
      interaction
    );
    if (result.isFailure()) {
      console.error('Failed to handle interaction:', result.error);
    }
  }

  async bootstrap(): Promise<void> {
    await this.services.initialize();
    await this.setupEventHandlers();
  }
}
