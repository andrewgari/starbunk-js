import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { parseYamlBots, botSchema } from '@/serialization/yaml-bot-parser';
import { YamlBotFactory } from '@/serialization/yaml-bot-factory';
import { logger } from '@/observability/logger';
import type { YamlValidationError } from '@/health/bunkbot-health';

export interface DiscoveryResult {
  configs: z.infer<typeof botSchema>[];
  yamlErrors: YamlValidationError[];
}

export class BotDiscoveryService {
  constructor(
    private factory: YamlBotFactory,
    private registry: BotRegistry,
  ) {}

  public async discover(botsDirectory: string): Promise<DiscoveryResult> {
    logger.withMetadata({ directory: botsDirectory }).info('Starting bot discovery');

    if (!fs.existsSync(botsDirectory)) {
      logger.withMetadata({ directory: botsDirectory }).error('Bots directory does not exist');
      throw new Error(`Bots directory does not exist: ${botsDirectory}`);
    }

    const files = fs.readdirSync(botsDirectory).filter(f => f.endsWith('.yml'));
    logger
      .withMetadata({
        directory: botsDirectory,
        files: files.join(', '),
      })
      .info(`Found ${files.length} YAML files`);

    let totalBotsLoaded = 0;
    let totalBotsFailed = 0;
    const allConfigs: z.infer<typeof botSchema>[] = [];
    const yamlErrors: YamlValidationError[] = [];

    for (const file of files) {
      const filePath = path.join(botsDirectory, file);
      logger.withMetadata({ file_path: filePath }).debug(`Processing bot file: ${file}`);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { 'reply-bots': bots } = parseYamlBots(content);

        logger
          .withMetadata({
            file,
            bot_count: bots.length,
            bot_names: bots.map(b => b.name).join(', '),
          })
          .info(`Parsed ${bots.length} bot(s) from ${file}`);

        for (const config of bots) {
          try {
            const bot = this.factory.createLiveBot(config);
            this.registry.register(bot);
            allConfigs.push(config);
            totalBotsLoaded++;

            logger
              .withMetadata({
                bot_name: config.name,
                file,
                triggers_count: config.triggers.length,
                identity_type: config.identity?.type,
              })
              .info(`Bot created and registered`);
          } catch (error) {
            totalBotsFailed++;
            const errMsg = error instanceof Error ? error.message : String(error);
            yamlErrors.push({ file, error: `Bot '${config.name}': ${errMsg}` });
            logger
              .withError(error)
              .withMetadata({
                bot_name: config.name,
                file,
              })
              .error(`Failed to create bot from config`);
          }
        }
      } catch (error) {
        totalBotsFailed++;
        const errMsg = error instanceof Error ? error.message : String(error);
        yamlErrors.push({ file, error: errMsg });
        logger
          .withError(error)
          .withMetadata({
            file,
            file_path: filePath,
          })
          .error(`Failed to load bot file`);
      }
    }

    logger
      .withMetadata({
        directory: botsDirectory,
        files_processed: files.length,
        bots_loaded: totalBotsLoaded,
        bots_failed: totalBotsFailed,
        yaml_errors: yamlErrors.length,
      })
      .info('Bot discovery complete');

    return { configs: allConfigs, yamlErrors };
  }
}
