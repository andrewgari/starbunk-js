import { registerHealthCheckModule } from '@starbunk/shared/observability/health-server';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('BunkBotHealth');

export interface YamlValidationError {
  file: string;
  error: string;
}

/**
 * Register a BunkBot-specific health check module that reports:
 * - The list of active/registered bots
 * - Any YAML validation errors encountered during bot discovery
 *
 * Call this after BotRegistry is populated (i.e. after discoverBots()).
 */
export function registerBunkBotHealthModule(yamlErrors: YamlValidationError[]): void {
  registerHealthCheckModule({
    name: 'bunkbot',
    getHealth: async () => {
      const registry = BotRegistry.getInstance();
      const bots = registry.getBots();

      const botList = bots.map(b => ({
        name: b.name,
        ignore_bots: b.ignore_bots,
        ignore_humans: b.ignore_humans,
        triggers: b.triggers?.length ?? 0,
      }));

      const status = yamlErrors.length > 0 ? 'degraded' : 'ok';

      return {
        status,
        active_bots: bots.length,
        bots: botList,
        yaml_errors: yamlErrors.length > 0 ? yamlErrors : undefined,
      };
    },
  });

  logger.info('BunkBot health module registered');
}
