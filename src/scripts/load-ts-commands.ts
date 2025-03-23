import fs from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import { logger } from '../services/logger';
import { loadCommand } from '../util/moduleLoader';

// Setup environment
process.env.NODE_ENV = 'development';
process.env.DEBUG = 'true';
process.env.TS_NODE_DEV = 'true';

// Helper function to validate a command object
function validateCommand(command: Command | null, filePath: string): boolean {
	if (!command) {
		logger.error(`❌ No command object returned from ${filePath}`);
		return false;
	}

	logger.info(`✅ Command loaded successfully: ${command.data?.name}`);

	// Validate the command has required properties
	if (!command.data) {
		logger.error(`❌ Command is missing data property: ${filePath}`);
		return false;
	}

	if (typeof command.execute !== 'function') {
		logger.error(`❌ Command is missing execute method: ${filePath}`);
		return false;
	}

	logger.info(`✅ Command implements all required methods`);
	return true;
}

async function loadAndValidateCommands(): Promise<void> {
	logger.info('Starting command loading diagnostic test');

	// Find all command files
	const commandDir = path.resolve('./src/starbunk/commands');
	logger.info(`Looking for commands in ${commandDir}`);

	if (!fs.existsSync(commandDir)) {
		logger.error(`❌ Command directory not found: ${commandDir}`);
		return;
	}

	const commandFiles = fs.readdirSync(commandDir)
		.filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('adapter.ts'))
		.map(file => path.join(commandDir, file));

	logger.info(`Found ${commandFiles.length} TypeScript command files`);

	// Try to load each command
	let successCount = 0;

	for (const commandFile of commandFiles) {
		try {
			logger.info(`Loading command from ${path.basename(commandFile)}...`);

			// First try direct require
			try {
				logger.info(`Attempting direct require for ${path.basename(commandFile)}`);
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const commandModule = require(commandFile.replace(/\.ts$/, ''));

				if (commandModule) {
					let command = null;

					// Check if it's a direct command object
					if (commandModule.data && commandModule.execute) {
						command = commandModule;
					}
					// Check if it's in the default export
					else if (commandModule.default && commandModule.default.data && commandModule.default.execute) {
						command = commandModule.default;
					}

					if (command) {
						if (validateCommand(command, commandFile)) {
							successCount++;
						}
						continue; // Skip to next command file
					} else {
						logger.warn(`⚠️ No valid command found in module: ${path.basename(commandFile)}`);
					}
				} else {
					logger.warn(`⚠️ No module loaded from require: ${path.basename(commandFile)}`);
				}
			} catch (requireError: unknown) {
				const errorMessage = requireError instanceof Error
					? requireError.message
					: 'Unknown error';
				logger.warn(`⚠️ Direct require failed for ${path.basename(commandFile)}: ${errorMessage}`);
				// Continue to try the loadCommand utility
			}

			// Try loadCommand utility
			logger.info(`Attempting loadCommand utility for ${path.basename(commandFile)}`);
			const command = await loadCommand(commandFile);

			if (validateCommand(command, commandFile)) {
				successCount++;
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error : new Error('Unknown error');
			logger.error(`❌ Failed to load command ${path.basename(commandFile)}:`, errorMessage);
		}
	}

	logger.info(`📊 Loading results: ${successCount} out of ${commandFiles.length} commands loaded successfully`);
}

// Run the tests
async function runTests(): Promise<void> {
	try {
		await loadAndValidateCommands();
		logger.info('All tests complete');
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error : new Error('Unknown error');
		logger.error('Error running tests:', errorMessage);
	}
}

// Execute the tests
runTests().catch(err => {
	logger.error('Fatal error:', err);
	process.exit(1);
});
