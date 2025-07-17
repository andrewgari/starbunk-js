import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@starbunk/shared';
import { BotConfiguration, CreateConfigurationRequest, UpdateConfigurationRequest } from '../types/botConfiguration';

export class BotConfigurationService {
  private static instance: BotConfigurationService;
  private configFilePath: string;
  private configuration: BotConfiguration | null = null;
  private isLoaded = false;

  constructor() {
    // Use configurable data directory for Docker/Unraid compatibility
    const dataDir = process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data');
    this.configFilePath = path.join(dataDir, 'bot-configuration.json');
    
    logger.info(`[BotConfiguration] Using data directory: ${dataDir}`);
    logger.info(`[BotConfiguration] Config file path: ${this.configFilePath}`);
  }

  static getInstance(): BotConfigurationService {
    if (!BotConfigurationService.instance) {
      BotConfigurationService.instance = new BotConfigurationService();
    }
    return BotConfigurationService.instance;
  }

  async loadConfiguration(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.configFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      // Try to load existing configuration
      try {
        const fileContent = await fs.readFile(this.configFilePath, 'utf-8');
        this.configuration = JSON.parse(fileContent);
        
        // Convert date strings back to Date objects
        if (this.configuration) {
          this.configuration.createdAt = new Date(this.configuration.createdAt);
          this.configuration.updatedAt = new Date(this.configuration.updatedAt);
        }
        
        logger.info('[BotConfiguration] Configuration loaded successfully');
      } catch (_error) {
        // File doesn't exist or is corrupted, create default configuration
        logger.info('[BotConfiguration] No existing configuration found, creating default');
        this.configuration = this.createDefaultConfiguration();
        await this.saveConfiguration();
      }

      this.isLoaded = true;
    } catch (error) {
      logger.error(`[BotConfiguration] Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private createDefaultConfiguration(): BotConfiguration {
    return {
      id: uuidv4(),
      isEnabled: true,
      responseFrequency: 25, // 25% chance to respond by default
      corePersonality: 'I am CovaBot, a helpful and friendly AI assistant. I aim to be supportive, encouraging, and provide useful information while maintaining a warm and approachable personality.',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async saveConfiguration(): Promise<void> {
    if (!this.configuration) {
      throw new Error('No configuration to save');
    }

    try {
      const configData = JSON.stringify(this.configuration, null, 2);
      await fs.writeFile(this.configFilePath, configData, 'utf-8');
      logger.info('[BotConfiguration] Configuration saved successfully');
    } catch (error) {
      logger.error(`[BotConfiguration] Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getConfiguration(): Promise<BotConfiguration> {
    await this.loadConfiguration();
    
    if (!this.configuration) {
      throw new Error('Configuration not available');
    }

    return { ...this.configuration };
  }

  async updateConfiguration(updates: UpdateConfigurationRequest): Promise<BotConfiguration> {
    await this.loadConfiguration();
    
    if (!this.configuration) {
      throw new Error('Configuration not available');
    }

    // Update configuration with provided values
    const updatedConfig: BotConfiguration = {
      ...this.configuration,
      ...updates,
      updatedAt: new Date()
    };

    // Validate values
    if (updatedConfig.responseFrequency < 0 || updatedConfig.responseFrequency > 100) {
      throw new Error('Response frequency must be between 0 and 100');
    }

    this.configuration = updatedConfig;
    await this.saveConfiguration();

    logger.info('[BotConfiguration] Configuration updated successfully');
    return { ...this.configuration };
  }

  async createConfiguration(request: CreateConfigurationRequest): Promise<BotConfiguration> {
    // This will reset to a new configuration
    this.configuration = {
      id: uuidv4(),
      isEnabled: request.isEnabled ?? true,
      responseFrequency: request.responseFrequency ?? 25,
      corePersonality: request.corePersonality ?? 'I am CovaBot, a helpful and friendly AI assistant.',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate values
    if (this.configuration.responseFrequency < 0 || this.configuration.responseFrequency > 100) {
      throw new Error('Response frequency must be between 0 and 100');
    }

    await this.saveConfiguration();
    logger.info('[BotConfiguration] New configuration created');
    return { ...this.configuration };
  }

  async resetToDefaults(): Promise<BotConfiguration> {
    this.configuration = this.createDefaultConfiguration();
    await this.saveConfiguration();
    logger.info('[BotConfiguration] Configuration reset to defaults');
    return { ...this.configuration };
  }

  // Helper methods for LLM integration
  async shouldRespond(): Promise<boolean> {
    const config = await this.getConfiguration();
    
    if (!config.isEnabled) {
      return false;
    }

    // Generate random number between 0-100 and check against frequency
    const randomChance = Math.random() * 100;
    return randomChance <= config.responseFrequency;
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfiguration();
    return config.isEnabled;
  }

  async getCorePersonality(): Promise<string> {
    const config = await this.getConfiguration();
    return config.corePersonality;
  }

  async getResponseFrequency(): Promise<number> {
    const config = await this.getConfiguration();
    return config.responseFrequency;
  }
}
