const { Client, Events, GatewayIntentBits } = require('discord.js');
const { starbnkToken, snowbunkToken } = require('./config.json');

// create a new discord client
const starbunkClient = new Client({ intents: [GatewayIntentBits.Guilds] });
const snowbunkClient = new Client({ intents: [GatewayIntentBits.Guilds] });

// Run Once when Client is Ready
starbunkClient.once(Events.ClientReady, starbunk => {
	console.log(`Ready! Logged in as ${starbunk.user.tag}`);
});

snowbunkClient.once(Events.ClientReady, snowbunk => {
	console.log(`Ready! Logged in as ${snowbunk.user.tag}`);
});

starbunkClient.login(starbnkToken);
snowbunkClient.login(snowbunkClient);
