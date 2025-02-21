import dotenv from 'dotenv';
import { GatewayIntentBits } from 'discord.js';

dotenv.config();

export const COMMON_INTENTS = [
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.MessageContent,
] as const;

export const STARBUNK_INTENTS = [
  ...COMMON_INTENTS,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
] as const;

interface BotConfig {
  token: string;
  clientId?: string;
  guildId?: string;
}

interface Config {
  starbunk: BotConfig;
  snowbunk: BotConfig;
}

function validateConfig(): Config {
  const {
    STARBUNK_TOKEN,
    SNOWBUNK_TOKEN,
    CLIENT_ID,
    GUILD_ID
  } = process.env;

  if (!STARBUNK_TOKEN || !SNOWBUNK_TOKEN) {
    throw new Error('Missing required bot tokens in environment variables');
  }

  return {
    starbunk: {
      token: STARBUNK_TOKEN,
      clientId: CLIENT_ID,
      guildId: GUILD_ID
    },
    snowbunk: {
      token: SNOWBUNK_TOKEN
    }
  };
}

export const config = validateConfig(); 