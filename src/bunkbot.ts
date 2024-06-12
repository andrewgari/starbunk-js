import { GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import StarbunkClient from './starbunk/starbunkClient';
import SnowbunkClient from './snowbunk/snowbunkClient';
dotenv.config();

console.log('Bot is starting...');

const starbunk = new StarbunkClient({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ]
});
const snowbunk = new SnowbunkClient({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks
  ]
});

const runStarbunkBot = async () => {
  // add handlers
  starbunk.bootstrap(
    process.env.STARBUNK_TOKEN!,
    process.env.CLIENT_ID!,
    process.env.GUILD_ID!
  );
  console.log('logging into starbunk');
  starbunk.login(process.env.STARBUNK_TOKEN);
};

const runSnowbunkBot = async () => {
  snowbunk.bootstrap();
  console.log('logging into snowbunk');
  snowbunk.login(process.env.SNOWBUNK_TOKEN);
};

const runBots = async () => {
  Promise.race([runStarbunkBot(), runSnowbunkBot()]);
};

runBots();
