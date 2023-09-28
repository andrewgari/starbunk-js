import { Client } from 'discord.js';
import config from './env';

console.log('Bot is starting...');

const client = new Client({
    intents: []
});

client.login(config.STARBUNK_TOKEN);
