import * as fs from 'fs';
import * as path from 'path';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { parseYamlBots } from '@/serialization/yaml-bot-parser';
import { YamlBotFactory } from '@/serialization/yaml-bot-factory';

export class BotDiscoveryService {
  constructor(
    private factory: YamlBotFactory,
    private registry: BotRegistry
  ) {}

  public async discover(botsDirectory: string): Promise<void> {
    const files = fs.readdirSync(botsDirectory).filter(f => f.endsWith('.yml'));

    for (const file of files) {
      const filePath = path.join(botsDirectory, file);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { 'reply-bots': bots } = parseYamlBots(content);

        for (const config of bots) {
          const bot = this.factory.createLiveBot(config);
          this.registry.register(bot);
        }
      } catch (error) {
        console.error(`Failed to load bot from ${filePath}:`, error);
      }
    }
  }
}
