import fs from 'fs';
import path from 'path';
import { loadCommand, loadModule } from './moduleLoader';

async function testCommandLoading() {
	console.log('Testing command loading directly...');

	// Set production mode since we're running compiled JS
	process.env.NODE_ENV = 'production';

	const commandsPath = path.join(__dirname, '..', 'starbunk', 'commands');
	console.log(`Looking for commands in: ${commandsPath}`);

	if (!fs.existsSync(commandsPath)) {
		console.error(`Directory not found: ${commandsPath}`);
		return;
	}

	// Get all .js or .ts files in the directory
	const fileExtension = process.env.NODE_ENV === 'production' ? '.js' : '.ts';
	const commandFiles = fs.readdirSync(commandsPath)
		.filter(file => file.endsWith(fileExtension))
		.filter(file => file !== 'adapter.ts' && file !== 'adapter.js')
		.map(file => path.join(commandsPath, file));

	console.log(`Found ${commandFiles.length} command files:`);
	commandFiles.forEach(file => console.log(` - ${file}`));

	let successfulCommands = 0;

	for (const commandPath of commandFiles) {
		try {
			console.log(`\nTesting command: ${path.basename(commandPath)}`);

			// First try to load the raw module
			console.log(`Loading module...`);
			const module = await loadModule(commandPath);

			if (!module) {
				console.error(`Failed to load module: ${commandPath}`);
				continue;
			}

			console.log(`Module loaded successfully.`);
			console.log('Module structure:', typeof module === 'object' ?
				Object.keys(module).join(', ') : typeof module);

			if (typeof module === 'object' && module !== null && 'default' in module) {
				console.log('Default export type:', typeof module.default);
				if (typeof module.default === 'object' && module.default !== null) {
					console.log('Default export keys:', Object.keys(module.default).join(', '));
				}
			}

			// Try to load the command
			console.log(`Attempting to load command...`);
			const command = await loadCommand(commandPath);

			if (command) {
				console.log(`✅ Command loaded successfully: ${command.data.name}`);
				console.log(`Description: ${command.data.description}`);
				successfulCommands++;
			} else {
				console.error(`❌ Failed to load command from: ${commandPath}`);
			}
		} catch (error) {
			console.error(`Error testing command ${commandPath}:`, error);
		}
	}

	console.log(`\nSummary: Successfully loaded ${successfulCommands} out of ${commandFiles.length} commands`);
}

testCommandLoading().catch(console.error);
