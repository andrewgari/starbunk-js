import StarbunkClient from './starbunk/starbunkClient';
import SnowbunkClient from './snowbunk/snowbunkClient';
import { config, COMMON_INTENTS, STARBUNK_INTENTS } from './config/botConfig';

class BunkBotManager {
  private readonly starbunk: StarbunkClient;
  private readonly snowbunk: SnowbunkClient;

  constructor() {
    this.starbunk = new StarbunkClient({
      intents: STARBUNK_INTENTS
    });

    this.snowbunk = new SnowbunkClient({
      intents: COMMON_INTENTS
    });
  }

  private async initializeStarbunk(): Promise<void> {
    const { token, clientId, guildId } = config.starbunk;
    
    if (!clientId || !guildId) {
      throw new Error('Missing required configuration for Starbunk');
    }

    this.starbunk.bootstrap(token, clientId, guildId);
    console.log('Logging into Starbunk...');
    await this.starbunk.login(token);
  }

  private async initializeSnowbunk(): Promise<void> {
    const { token } = config.snowbunk;

    this.snowbunk.bootstrap();
    console.log('Logging into Snowbunk...');
    await this.snowbunk.login(token);
  }

  async start(): Promise<void> {
    try {
      await Promise.race([
        this.initializeStarbunk(),
        this.initializeSnowbunk()
      ]);
    } catch (error) {
      console.error('Failed to start bots:', error);
      process.exit(1);
    }
  }
}

console.log('Bot is starting...');
new BunkBotManager().start().catch(console.error);
