import { Client } from 'discord.js';
import bootstrap from './bots/bootstrap';
import dotenv from 'dotenv';

console.log('Bot is starting...');

const client = new Client({
    intents: []
});

// add handlers
bootstrap(client);

console.log('lalalalallalala', process.env.STARBUNK_TOKEN);
client.login(dotenv.config().STARBUNK_TOKEN);
