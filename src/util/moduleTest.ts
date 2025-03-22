import path from 'path';
import { loadBot, loadCommand, scanDirectory } from './moduleLoader';

async function main() {
	try {
		console.log('Starting module test...');

		// Test bot loading
		const botPath = path.resolve(__dirname, '../starbunk/bots');
		console.log(`Scanning bot directory: ${botPath}`);

		const botFiles = scanDirectory(botPath, '.ts');
		console.log(`Found ${botFiles.length} bot files`);

		for (const file of botFiles) {
			console.log(`Testing bot file: ${file}`);
			const bot = await loadBot(file);

			if (bot) {
				console.log(`✅ Successfully loaded bot: ${bot.defaultBotName}`);
				console.log(`   Bot properties: ${Object.keys(bot).join(', ')}`);
			} else {
				console.log(`❌ Failed to load bot from ${file}`);
			}
		}

		// Test command loading
		const commandPath = path.resolve(__dirname, '../starbunk/commands');
		console.log(`\nScanning command directory: ${commandPath}`);

		const commandFiles = scanDirectory(commandPath, '.ts');
		console.log(`Found ${commandFiles.length} command files`);

		for (const file of commandFiles) {
			console.log(`Testing command file: ${file}`);
			const command = await loadCommand(file);

			if (command) {
				console.log(`✅ Successfully loaded command: ${command.data.name}`);
				console.log(`   Command properties: ${Object.keys(command).join(', ')}`);
			} else {
				console.log(`❌ Failed to load command from ${file}`);
			}
		}

	} catch (error) {
		console.error('Error in test:', error);
	}
}

main().catch(console.error);
