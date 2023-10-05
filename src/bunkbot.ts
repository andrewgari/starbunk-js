import { GatewayIntentBits } from 'discord.js';
import bootstrap from './bootstrap';
import dotenv from 'dotenv';
import Client from './discord/DiscordClient';
dotenv.config();

console.log('Bot is starting...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks
  ]
});

// add handlers
bootstrap(
  client,
  process.env.STARBUNK_TOKEN!,
  process.env.CLIENT_ID!,
  process.env.GUILD_ID!
);

client.login(process.env.STARBUNK_TOKEN!);
