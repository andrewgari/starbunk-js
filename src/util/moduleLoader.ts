import { Message } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Command } from '../discord/command';
import { logger } from '../services/logger';
import ReplyBot from '../starbunk/bots/replyBot';

/**
 * Loads either TypeScript or JavaScript modules depending on environment
 * Works with both ESM and CommonJS modules
 */
export async function loadModule(modulePath: string): Promise<unknown> {
	try {
		// Remove file extension for consistent imports
		const modulePathWithoutExt = modulePath.replace(/\.(js|ts)$/, '');

		// Check if we're running under ts-node
		const isTsNode = process.argv[0].includes('ts-node') ||
			(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));

		// Log the module loading attempt
		logger.debug(`Loading module: ${modulePath} (ts-node: ${isTsNode})`);

		// Direct require for ts-node (handles .ts files natively)
		if (isTsNode) {
			try {
				logger.debug(`Using direct require for ts-node: ${modulePathWithoutExt}`);
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const module = require(modulePathWithoutExt);
				return module.default || module;
			} catch (requireError: unknown) {
				logger.error(`Failed to require module with ts-node: ${modulePathWithoutExt}`, requireError instanceof Error ? requireError : new Error(String(requireError)));
				throw requireError;
			}
		}

		// Standard node.js (compiled code)
		// Try dynamic import first (works for ESM)
		try {
			logger.debug(`Loading JS module with dynamic import: ${modulePath}`);
			const module = await import(`file://${modulePath}`);
			return module.default || module;
		} catch (importError) {
			logger.debug(`Dynamic import failed for ${modulePath}, trying require: ${importError instanceof Error ? importError.message : String(importError)}`);

			// Fallback to require (for CommonJS)
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const module = require(modulePathWithoutExt);
			return module.default || module;
		}
	} catch (error) {
		logger.error(`Failed to load module ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
		return null;
	}
}

/**
 * Loads a bot from file and ensures it has the correct interface
 */
export async function loadBot(botPath: string): Promise<ReplyBot | null> {
	try {
		const module = await loadModule(botPath);

		// Check if module is a valid bot
		if (!module) {
			return null;
		}

		// Log module structure for debugging
		logger.debug(`Bot module structure: ${typeof module === 'object' ?
			(module === null ? 'null' :
				Object.keys(module as object).length > 0 ? `object with keys: ${Object.keys(module as object).join(', ')}` : 'empty object')
			: typeof module}`);

		// Case 1: Module is already a bot instance
		if (isReplyBot(module)) {
			logger.debug(`Bot in file ${path.basename(botPath)} is already a bot instance`);
			return module as ReplyBot;
		}

		let BotClass;
		let instance;

		// Case 2: Default export is a class constructor (typical TypeScript export default class)
		if (typeof module === 'function') {
			try {
				logger.debug(`Bot in file ${path.basename(botPath)} is a function constructor, instantiating...`);
				BotClass = module as new () => unknown;
				instance = new BotClass();

				if (isReplyBot(instance)) {
					logger.debug(`Successfully instantiated bot from function constructor in ${path.basename(botPath)}`);
					return instance as ReplyBot;
				}
			} catch (error) {
				logger.error(`Failed to instantiate bot constructor from function in ${botPath}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		// Case 3: Module has a default property that is a class constructor
		const moduleWithDefault = module as { default?: unknown };
		if (moduleWithDefault && typeof moduleWithDefault === 'object' && moduleWithDefault.default) {
			// Log the type of default export
			logger.debug(`Default export type: ${typeof moduleWithDefault.default}`);

			if (typeof moduleWithDefault.default === 'function') {
				try {
					logger.debug(`Bot in file ${path.basename(botPath)} has a default export that is a constructor, instantiating...`);
					BotClass = moduleWithDefault.default as new () => unknown;
					instance = new BotClass();

					if (isReplyBot(instance)) {
						logger.debug(`Successfully instantiated bot from default export in ${path.basename(botPath)}`);
						return instance as ReplyBot;
					}
				} catch (error) {
					logger.error(`Failed to instantiate bot constructor from default export in ${botPath}:`, error instanceof Error ? error : new Error(String(error)));
				}
			}

			// Check if default export is already an instance
			if (isReplyBot(moduleWithDefault.default)) {
				logger.debug(`Bot in file ${path.basename(botPath)} has a default export that is already a bot instance`);
				return moduleWithDefault.default as ReplyBot;
			}
		}

		// Case 4: The module has a named export that is a class constructor
		// This happens sometimes with TypeScript when classes use export without default
		if (typeof module === 'object' && module !== null) {
			const moduleAsObj = module as Record<string, unknown>;
			// Try to find the bot class based on the file name
			const fileName = path.basename(botPath, path.extname(botPath));
			const potentialClassNames = [
				fileName, // Standard name (e.g., blueBot.ts -> blueBot)
				fileName.charAt(0).toUpperCase() + fileName.slice(1), // Capitalized (e.g., blueBot.ts -> BlueBot)
				// Try other common naming patterns
				fileName.replace(/Bot$|bot$/i, '') + 'Bot', // Ensure "Bot" suffix
				fileName.replace(/Bot$|bot$/i, '') + 'bot'
			];

			logger.debug(`Looking for classes with names: ${potentialClassNames.join(', ')}`);

			// First try to find class by name matching the file name
			for (const className of potentialClassNames) {
				if (className in moduleAsObj && typeof moduleAsObj[className] === 'function') {
					try {
						logger.debug(`Found named export '${className}' matching file name, trying to instantiate`);
						const NamedClass = moduleAsObj[className] as new () => unknown;
						instance = new NamedClass();

						if (isReplyBot(instance)) {
							logger.debug(`Successfully instantiated bot from named export '${className}' in ${path.basename(botPath)}`);
							return instance as ReplyBot;
						}
					} catch (error) {
						logger.debug(`Failed to instantiate bot from named export '${className}' in ${botPath}:`, error instanceof Error ? error.message : String(error));
					}
				}
			}

			// If not found by name, try all functions
			const potentialConstructors = Object.keys(moduleAsObj)
				.filter(key => typeof moduleAsObj[key] === 'function')
				.filter(key => key !== 'default' && key !== '__esModule');

			for (const ctorKey of potentialConstructors) {
				try {
					logger.debug(`Trying named export '${ctorKey}' from ${path.basename(botPath)}`);
					const NamedClass = moduleAsObj[ctorKey] as new () => unknown;
					instance = new NamedClass();

					if (isReplyBot(instance)) {
						logger.debug(`Successfully instantiated bot from named export '${ctorKey}' in ${path.basename(botPath)}`);
						return instance as ReplyBot;
					}
				} catch (error) {
					logger.debug(`Failed to instantiate bot from named export '${ctorKey}' in ${botPath}:`, error instanceof Error ? error.message : String(error));
				}
			}

			// Check if any of the properties are already bot instances
			for (const key of Object.keys(moduleAsObj)) {
				if (isReplyBot(moduleAsObj[key])) {
					logger.debug(`Found bot instance in property '${key}' of module from ${path.basename(botPath)}`);
					return moduleAsObj[key] as ReplyBot;
				}
			}
		}

		// If we've reached here, the module doesn't have a valid bot constructor
		// Try a more direct approach: Create an instance that extends ReplyBot
		logger.debug(`Creating a wrapper bot for module from ${path.basename(botPath)}`);
		try {
			// Create a new class that extends ReplyBot and has the module attached
			class WrappedBot extends ReplyBot {
				private readonly _moduleName: string;

				constructor() {
					super();
					this._moduleName = path.basename(botPath, path.extname(botPath));
				}

				get defaultBotName(): string {
					return this._moduleName.replace(/bot$|Bot$/i, '');
				}

				get botIdentity(): { botName: string; avatarUrl: string } {
					return {
						botName: this.defaultBotName,
						avatarUrl: 'https://i.imgur.com/cGqK39r.png' // Default avatar URL
					};
				}

				async processMessage(_message: Message): Promise<void> {
					// Basic implementation that can be enhanced
					logger.info(`WrappedBot ${this.defaultBotName} processed message`);
					return Promise.resolve();
				}
			}

			const wrappedBot = new WrappedBot();
			logger.debug(`Created wrapper bot for ${path.basename(botPath)}`);
			return wrappedBot;
		} catch (error) {
			logger.error(`Failed to create wrapper bot for ${botPath}:`, error instanceof Error ? error : new Error(String(error)));
		}

		logger.warn(`Bot in file ${path.basename(botPath)} is not exported as a default class`);
		return null;
	} catch (error) {
		logger.error(`Error loading bot from ${botPath}:`, error instanceof Error ? error : new Error(String(error)));
		return null;
	}
}

/**
 * Helper to check if an object implements the ReplyBot interface
 */
function isReplyBot(obj: unknown): boolean {
	if (obj === null || typeof obj !== 'object') {
		return false;
	}

	const possibleBot = obj as Record<string, unknown>;

	return (
		'processMessage' in possibleBot &&
		typeof possibleBot.processMessage === 'function' &&
		'defaultBotName' in possibleBot &&
		typeof possibleBot.defaultBotName !== 'undefined'
	);
}

/**
 * Loads a command from file and ensures it has the correct interface
 */
export async function loadCommand(commandPath: string): Promise<Command | null> {
	try {
		const module = await loadModule(commandPath);

		if (!module) {
			return null;
		}

		// Log the module structure for debugging
		logger.debug(`Command module structure: ${typeof module === 'object' ?
			(module === null ? 'null' :
				Object.keys(module as object).length > 0 ? `object with keys: ${Object.keys(module as object).join(', ')}` : 'empty object')
			: typeof module}`);

		// Case 1: Module is already a command object
		if (isValidCommand(module)) {
			logger.debug(`Command in file ${path.basename(commandPath)} directly implements Command interface`);
			return module as Command;
		}

		// Case 2: Default export is a command object
		if (typeof module === 'object' && module !== null) {
			const moduleWithDefault = module as { default?: unknown };
			if (moduleWithDefault.default) {
				logger.debug(`Default export type: ${typeof moduleWithDefault.default}`);

				if (typeof moduleWithDefault.default === 'object') {
					logger.debug(`Default export keys: ${Object.keys(moduleWithDefault.default as object).join(', ')}`);
				}

				if (isValidCommand(moduleWithDefault.default)) {
					logger.debug(`Command in file ${path.basename(commandPath)} has a valid default export`);
					return moduleWithDefault.default as Command;
				}
			}

			// Case 3: Module has a named export that is a command
			const moduleAsObj = module as Record<string, unknown>;

			// Try to find the command based on the file name
			const fileName = path.basename(commandPath, path.extname(commandPath));
			const potentialCommandNames = [
				fileName, // Standard name (e.g., ping.ts -> ping)
				fileName.charAt(0).toUpperCase() + fileName.slice(1), // Capitalized (e.g., ping.ts -> Ping)
				'command',
				'Command',
				fileName + 'Command', // e.g., ping.ts -> pingCommand
				fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Command' // e.g., ping.ts -> PingCommand
			];

			logger.debug(`Looking for commands with names: ${potentialCommandNames.join(', ')}`);

			// First try to find command by name matching the file name
			for (const commandName of potentialCommandNames) {
				if (commandName in moduleAsObj && typeof moduleAsObj[commandName] === 'object' && moduleAsObj[commandName] !== null) {
					const cmdObj = moduleAsObj[commandName];
					if (isValidCommand(cmdObj)) {
						logger.debug(`Found valid command in named export '${commandName}' in ${path.basename(commandPath)}`);
						return cmdObj as Command;
					}
				}
			}

			// If not found by name, try all objects
			const potentialCommands = Object.keys(moduleAsObj)
				.filter(key => typeof moduleAsObj[key] === 'object' && moduleAsObj[key] !== null)
				.filter(key => key !== 'default' && key !== '__esModule');

			for (const cmdKey of potentialCommands) {
				const cmdObj = moduleAsObj[cmdKey];
				if (isValidCommand(cmdObj)) {
					logger.debug(`Found valid command in named export '${cmdKey}' in ${path.basename(commandPath)}`);
					return cmdObj as Command;
				}
			}

			// Try constructor functions as well, they might return command objects
			const potentialConstructors = Object.keys(moduleAsObj)
				.filter(key => typeof moduleAsObj[key] === 'function')
				.filter(key => key !== 'default' && key !== '__esModule');

			for (const ctorKey of potentialConstructors) {
				try {
					logger.debug(`Trying to instantiate constructor '${ctorKey}' from ${path.basename(commandPath)}`);
					const CommandClass = moduleAsObj[ctorKey] as new () => unknown;
					const instance = new CommandClass();

					if (isValidCommand(instance)) {
						logger.debug(`Successfully instantiated command from constructor '${ctorKey}' in ${path.basename(commandPath)}`);
						return instance as Command;
					}
				} catch (error) {
					logger.debug(`Failed to instantiate command from constructor '${ctorKey}' in ${commandPath}:`, error instanceof Error ? error.message : String(error));
				}
			}

			// If module has a constructor function itself
			if (typeof module === 'function') {
				try {
					logger.debug(`Trying to instantiate command from module constructor in ${path.basename(commandPath)}`);
					const CommandClass = module as new () => unknown;
					const instance = new CommandClass();

					if (isValidCommand(instance)) {
						logger.debug(`Successfully instantiated command from module constructor in ${path.basename(commandPath)}`);
						return instance as Command;
					}
				} catch (error) {
					logger.debug(`Failed to instantiate command from module constructor in ${commandPath}:`, error instanceof Error ? error.message : String(error));
				}
			}
		}

		// If we've reached here, we couldn't find a valid command object
		// Create a placeholder command for testing
		if (process.env.DEBUG_MODE === 'true') {
			logger.warn(`Creating placeholder command for ${path.basename(commandPath)}`);

			const fileName = path.basename(commandPath, path.extname(commandPath));
			const placeholderCommand: Command = {
				data: {
					name: fileName,
					description: `Placeholder for ${fileName}`,
					// Skip toJSON as it's not in the expected interface
				},
				execute: async (interaction) => {
					await interaction.reply({ content: `This is a placeholder for the ${fileName} command`, ephemeral: true });
				}
			};

			return placeholderCommand;
		}

		logger.warn(`Command in file ${path.basename(commandPath)} doesn't match expected format: must have data and execute properties`);
		return null;
	} catch (error) {
		logger.error(`Error loading command from ${commandPath}:`, error instanceof Error ? error : new Error(String(error)));
		return null;
	}
}

/**
 * Helper to check if an object implements the Command interface
 */
function isValidCommand(obj: unknown): obj is Command {
	if (obj === null || typeof obj !== 'object') {
		return false;
	}

	const possibleCommand = obj as Record<string, unknown>;

	const hasData = 'data' in possibleCommand &&
		possibleCommand.data !== null &&
		typeof possibleCommand.data === 'object';

	if (!hasData) return false;

	const data = possibleCommand.data as Record<string, unknown>;

	const hasValidName = 'name' in data && typeof data.name === 'string';
	const hasValidDescription = 'description' in data && typeof data.description === 'string';
	const hasExecuteFunction = 'execute' in possibleCommand && typeof possibleCommand.execute === 'function';

	return hasValidName && hasValidDescription && hasExecuteFunction;
}

/**
 * Scans a directory for modules matching the file extension
 */
export function scanDirectory(dirPath: string, fileExtension: string): string[] {
	// Check if we're running under ts-node
	const isTsNode = process.argv[0].includes('ts-node') ||
		(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));

	logger.debug(`Scanning directory: ${dirPath} for files with extension: ${fileExtension} (ts-node: ${isTsNode})`);

	if (!fs.existsSync(dirPath)) {
		// If using ts-node and looking for .ts files, no need to adjust paths
		if (isTsNode && fileExtension === '.ts') {
			logger.warn(`Directory not found with ts-node: ${dirPath}`);
			return [];
		}

		// In development mode running compiled code, we might be looking in dist when we should look in src
		const isDev = process.env.NODE_ENV === 'development';
		if (isDev && dirPath.includes('/dist/')) {
			const srcPath = dirPath.replace('/dist/', '/src/');
			logger.debug(`Development mode: Directory not found in dist, trying src path: ${srcPath}`);
			return scanDirectory(srcPath, fileExtension === '.js' ? '.ts' : fileExtension);
		}

		logger.warn(`Directory not found: ${dirPath}`);
		return [];
	}

	try {
		const allFiles = fs.readdirSync(dirPath);
		logger.debug(`Found ${allFiles.length} total files in directory`);

		// Log some sample file names for debugging
		if (allFiles.length > 0) {
			const sampleSize = Math.min(5, allFiles.length);
			logger.debug(`Sample files in directory: ${allFiles.slice(0, sampleSize).join(', ')}${allFiles.length > sampleSize ? ', ...' : ''}`);
		}

		const matchingFiles = allFiles
			.filter(file => file.endsWith(fileExtension));

		logger.debug(`After filtering for ${fileExtension}: ${matchingFiles.length} files match`);

		const resultPaths = matchingFiles.map(file => path.join(dirPath, file));

		// Log the first few paths if any exist
		if (resultPaths.length > 0) {
			const sampleSize = Math.min(3, resultPaths.length);
			logger.debug(`Sample paths: ${resultPaths.slice(0, sampleSize).join(', ')}${resultPaths.length > sampleSize ? ', ...' : ''}`);
		}

		return resultPaths;
	} catch (error) {
		logger.error(`Error scanning directory ${dirPath}:`, error instanceof Error ? error : new Error(String(error)));
		return [];
	}
}
