import { Client, GatewayIntentBits } from 'discord.js';
import bootstrap from './bots/Bootstrap';
import dotenv from 'dotenv';
dotenv.config();

console.log('Bot is starting...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// add handlers
bootstrap(client);

client.login(process.env.STARBUNK_TOKEN);
