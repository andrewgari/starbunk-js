import fs from 'fs';
import path from 'path';
import { loadBot, loadModule } from './moduleLoader';

async function testBotLoading() {
	console.log('Testing bot loading directly...');

	// Set production mode since we're running compiled JS
	process.env.NODE_ENV = 'production';

	const botsPath = path.join(__dirname, '..', 'starbunk', 'bots', 'reply-bots');
	console.log(`Looking for bots in: ${botsPath}`);

	if (!fs.existsSync(botsPath)) {
		console.error(`Directory not found: ${botsPath}`);
		return;
	}

	// Get all .js or .ts files in the directory
	const fileExtension = process.env.NODE_ENV === 'production' ? '.js' : '.ts';
	const botFiles = fs.readdirSync(botsPath)
		.filter(file => file.endsWith(fileExtension))
		.map(file => path.join(botsPath, file));

	console.log(`Found ${botFiles.length} bot files:`);
	botFiles.forEach(file => console.log(` - ${file}`));

	let successfulBots = 0;

	for (const botPath of botFiles) {
		try {
			console.log(`\nTesting bot: ${path.basename(botPath)}`);

			// First try to load the raw module
			console.log(`Loading module...`);
			const module = await loadModule(botPath);

			if (!module) {
				console.error(`Failed to load module: ${botPath}`);
				continue;
			}

			console.log(`Module loaded successfully.`);

			// Try to instantiate the bot
			console.log(`Attempting to create bot instance...`);
			const bot = await loadBot(botPath);

			if (bot) {
				console.log(`✅ Bot loaded successfully: ${bot.defaultBotName}`);
				successfulBots++;
			} else {
				console.error(`❌ Failed to create bot instance from: ${botPath}`);
			}
		} catch (error) {
			console.error(`Error testing bot ${botPath}:`, error);
		}
	}

	console.log(`\nSummary: Successfully loaded ${successfulBots} out of ${botFiles.length} bots`);
}

testBotLoading().catch(console.error);
