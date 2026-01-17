import * as fs from 'fs';
import * as path from 'path';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { parseYamlBots } from '@/serialization/yaml-bot-parser';
import { YamlBotFactory } from '@/serialization/yaml-bot-factory';
import { logger } from '@starbunk/shared/observability/logger';

export class BotDiscoveryService {
  constructor(
    private factory: YamlBotFactory,
    private registry: BotRegistry
  ) {}

  public async discover(botsDirectory: string): Promise<void> {
    logger.info('Starting bot discovery', { directory: botsDirectory });

    if (!fs.existsSync(botsDirectory)) {
      logger.error('Bots directory does not exist', undefined, { directory: botsDirectory });
      throw new Error(`Bots directory does not exist: ${botsDirectory}`);
    }

    const files = fs.readdirSync(botsDirectory).filter(f => f.endsWith('.yml'));
    logger.info(`Found ${files.length} YAML files`, {
      directory: botsDirectory,
      files: files.join(', '),
    });

    let totalBotsLoaded = 0;
    let totalBotsFailed = 0;

    for (const file of files) {
      const filePath = path.join(botsDirectory, file);
      logger.debug(`Processing bot file: ${file}`, { file_path: filePath });

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { 'reply-bots': bots } = parseYamlBots(content);

        logger.info(`Parsed ${bots.length} bot(s) from ${file}`, {
          file,
          bot_count: bots.length,
          bot_names: bots.map(b => b.name).join(', '),
        });

        for (const config of bots) {
          try {
            const bot = this.factory.createLiveBot(config);
            this.registry.register(bot);
            totalBotsLoaded++;

            logger.info(`Bot created and registered`, {
              bot_name: config.name,
              file,
              triggers_count: config.triggers.length,
              identity_type: config.identity?.type,
            });
          } catch (error) {
            totalBotsFailed++;
            logger.error(`Failed to create bot from config`, error, {
              bot_name: config.name,
              file,
            });
          }
        }
      } catch (error) {
        totalBotsFailed++;
        logger.error(`Failed to load bot file`, error, {
          file,
          file_path: filePath,
        });
      }
    }

    logger.info('Bot discovery complete', {
      directory: botsDirectory,
      files_processed: files.length,
      bots_loaded: totalBotsLoaded,
      bots_failed: totalBotsFailed,
    });
  }
}
