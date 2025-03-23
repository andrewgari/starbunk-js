import { isDebugMode } from '@/environment';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Command } from '../discord/command';
import { logger } from '../services/logger';
import ReplyBot from '../starbunk/bots/replyBot';

/**
 * Resolves a module path with support for path aliases
 */
function resolveModulePath(modulePath: string): string {
	// Handle TypeScript path aliases
	if (modulePath.includes('@/')) {
		// Convert @/ paths to relative paths
		return modulePath.replace('@/', `${process.cwd()}/src/`);
	}
	return modulePath;
}

/**
 * Loads either TypeScript or JavaScript modules depending on environment
 * Works with both ESM and CommonJS modules
 */
export async function loadModule(modulePath: string): Promise<unknown> {
	try {
		logger.info(`Attempting to load module: ${modulePath}`);

		// Special case for TypeScript files in development
		if (process.env.TS_NODE_DEV === 'true' && modulePath.endsWith('.ts')) {
			try {
				// Resolve module path with aliases
				const resolvedModulePath = pathToFileURL(resolveModulePath(modulePath)).href;
				logger.debug(`Using dynamic import with resolved path: ${resolvedModulePath}`);

				const module = await import(resolvedModulePath);
				logger.debug(`Successfully imported module dynamically: ${modulePath}`);
				return module;
			} catch (error) {
				logger.error(`Failed to dynamic import module: ${modulePath}`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		// For JavaScript files or when TS_NODE_DEV is not set
		try {
			// Load with require (works for compiled JS)
			logger.debug(`Using require for module: ${modulePath}`);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const module = require(modulePath);
			logger.debug(`Successfully required module: ${modulePath}`);
			return module;
		} catch (error) {
			logger.error(`Failed to require module: ${modulePath}`, error instanceof Error ? error : new Error(String(error)));
		}

		// As a last resort, try dynamic import
		try {
			const fileUrl = pathToFileURL(modulePath).href;
			logger.debug(`Trying dynamic import as last resort: ${fileUrl}`);
			const module = await import(fileUrl);
			logger.debug(`Successfully imported module as last resort: ${modulePath}`);
			return module;
		} catch (error) {
			logger.error(`Failed to load module ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
			return null;
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
		logger.info(`Attempting to load bot: ${botPath}`);

		// For TypeScript files, use the standard loading approach (not direct import)
		const module = await loadModule(botPath);

		// Check if module is a valid bot
		if (!module) {
			logger.warn(`No module loaded from: ${botPath}`);
			return null;
		}

		// Log module structure for debugging
		logger.debug(`Bot module structure from ${path.basename(botPath)}: ${typeof module === 'object' ?
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
					logger.info(`Successfully instantiated bot from function constructor in ${path.basename(botPath)}`);
					return instance as ReplyBot;
				} else {
					logger.debug(`Instance from function constructor does not implement ReplyBot interface: ${Object.keys(instance as object).join(', ')}`);
				}
			} catch (error) {
				logger.error(`Failed to instantiate bot constructor from function in ${botPath}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		// Case 3: Module has a default property that is a class constructor
		if (module && typeof module === 'object' && 'default' in module) {
			const moduleWithDefault = module as { default?: unknown };
			// Log the type of default export
			logger.debug(`Default export type: ${typeof moduleWithDefault.default}`);

			if (typeof moduleWithDefault.default === 'function') {
				try {
					logger.debug(`Bot in file ${path.basename(botPath)} has a default export that is a constructor, instantiating...`);
					BotClass = moduleWithDefault.default as new () => unknown;
					instance = new BotClass();

					if (isReplyBot(instance)) {
						logger.info(`Successfully instantiated bot from default export in ${path.basename(botPath)}`);
						return instance as ReplyBot;
					} else {
						logger.debug(`Instance from default export does not implement ReplyBot interface: ${Object.keys(instance as object || {}).join(', ')}`);
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

		// We successfully loaded a module but couldn't find a bot constructor or instance
		logger.warn(`Bot in file ${path.basename(botPath)} was loaded but does not export a valid bot`);
		logger.warn(`If you're using TypeScript, make sure you use "export default class YourBot extends ReplyBot"`);
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
		logger.debug(`Not a ReplyBot: object is null or not an object (type: ${typeof obj})`);
		return false;
	}

	const possibleBot = obj as Record<string, unknown>;

	// Debug: Log the keys to help diagnose issues
	if (isDebugMode()) {
		logger.debug(`Checking if object is ReplyBot. Keys: ${Object.keys(possibleBot).join(', ')}`);

		// Check each required property and log the result
		logger.debug(`Has processMessage: ${'processMessage' in possibleBot}`);
		if ('processMessage' in possibleBot) {
			logger.debug(`processMessage type: ${typeof possibleBot.processMessage}`);
		}

		logger.debug(`Has defaultBotName: ${'defaultBotName' in possibleBot}`);
		if ('defaultBotName' in possibleBot) {
			logger.debug(`defaultBotName type: ${typeof possibleBot.defaultBotName}`);
		}
	}

	// Also check if it's an instance of ReplyBot using prototype chain
	const isReplyBotInstance =
		'processMessage' in possibleBot &&
		typeof possibleBot.processMessage === 'function' &&
		'defaultBotName' in possibleBot &&
		typeof possibleBot.defaultBotName !== 'undefined';

	// For TypeScript classes, check if the constructor name indicates a bot
	const constructorIsBot =
		'constructor' in possibleBot &&
		possibleBot.constructor &&
		typeof possibleBot.constructor === 'function' &&
		'name' in possibleBot.constructor &&
		typeof possibleBot.constructor.name === 'string' &&
		(
			possibleBot.constructor.name.includes('Bot') ||
			possibleBot.constructor.name.includes('bot')
		);

	if (constructorIsBot && !isReplyBotInstance) {
		logger.debug(`Object has Bot in constructor name but doesn't fully implement ReplyBot interface: ${possibleBot.constructor.name}`);
	}

	return isReplyBotInstance;
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
		if (isDebugMode()) {
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
	// Log environment info
	const isTsNode = process.argv[0].includes('ts-node') ||
		(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
	const isDev = process.env.NODE_ENV === 'development';
	const isDebug = isDebugMode();

	logger.info(`Scanning directory: ${dirPath} for files with extension ${fileExtension}`);
	logger.info(`Environment: ts-node=${isTsNode}, dev=${isDev}, debug=${isDebug}`);
	logger.info(`Current directory: ${process.cwd()}`);

	// Handle non-existent directories
	if (!fs.existsSync(dirPath)) {
		logger.warn(`Directory not found: ${dirPath}`);

		// Try to find alternative paths
		const altPaths = [
			dirPath.replace('/dist/', '/src/'),
			dirPath.replace('/src/', '/dist/'),
			path.join(process.cwd(), dirPath.replace(/^\//, '')),
			path.join(process.cwd(), 'src', dirPath.replace(/^\//, '')),
			path.join(process.cwd(), 'dist', dirPath.replace(/^\//, ''))
		];

		logger.debug(`Trying alternative paths: ${altPaths.join(', ')}`);

		for (const altPath of altPaths) {
			if (fs.existsSync(altPath)) {
				logger.info(`Found alternative path: ${altPath}`);
				return scanDirectory(altPath, fileExtension);
			}
		}

		return [];
	}

	try {
		// Get all files in the directory
		const allFiles = fs.readdirSync(dirPath);
		logger.info(`Found ${allFiles.length} files in directory: ${dirPath}`);

		if (isDebug) {
			logger.debug(`All files in directory: ${allFiles.join(', ')}`);
		}

		// Filter for files with the right extension
		const matchingFiles = allFiles.filter(file => file.endsWith(fileExtension));
		logger.info(`Found ${matchingFiles.length} files with extension ${fileExtension}`);

		if (matchingFiles.length === 0) {
			// Try alternative extension if none found
			const altExtension = fileExtension === '.ts' ? '.js' : '.ts';
			const altFiles = allFiles.filter(file => file.endsWith(altExtension));

			if (altFiles.length > 0) {
				logger.info(`No files with ${fileExtension} found, but found ${altFiles.length} files with ${altExtension}`);
				if (isDev || isDebug) {
					// In dev mode, try the alternative extension
					return scanDirectory(dirPath, altExtension);
				}
			}
		}

		// Map to full paths
		const resultPaths = matchingFiles.map(file => path.join(dirPath, file));

		if (resultPaths.length > 0) {
			logger.info(`Files to load: ${resultPaths.map(p => path.basename(p)).join(', ')}`);
		} else {
			logger.warn(`No matching files found in ${dirPath} with extension ${fileExtension}`);
		}

		return resultPaths;
	} catch (error) {
		logger.error(`Error scanning directory ${dirPath}:`, error instanceof Error ? error : new Error(String(error)));
		return [];
	}
}

/**
 * Debug helper to test TypeScript module loading with a specific file
 * Can be used to verify modules are loading correctly
 */
export async function debugModuleLoading(filePath: string): Promise<void> {
	try {
		logger.info(`[DEBUG] Testing module loading for file: ${filePath}`);

		// Check file existence
		if (!fs.existsSync(filePath)) {
			logger.error(`[DEBUG] File not found: ${filePath}`);
			return;
		}

		// Load with direct import
		try {
			const fileUrl = `file://${path.resolve(filePath)}`;
			logger.info(`[DEBUG] Attempting dynamic import via URL: ${fileUrl}`);

			const module = await import(fileUrl);
			logger.info(`[DEBUG] Module keys: ${Object.keys(module).join(', ')}`);

			if (module.default) {
				logger.info(`[DEBUG] Default export type: ${typeof module.default}`);

				// If it's a class constructor
				if (typeof module.default === 'function') {
					try {
						const instance = new module.default();
						logger.info(`[DEBUG] Instantiated default export: ${instance.constructor.name}`);
						logger.info(`[DEBUG] Instance keys: ${Object.keys(instance).join(', ')}`);
					} catch (err) {
						logger.error(`[DEBUG] Failed to instantiate class: ${err instanceof Error ? err.message : String(err)}`);
					}
				}
			}
		} catch (err) {
			logger.error(`[DEBUG] Dynamic import failed: ${err instanceof Error ? err.message : String(err)}`);
		}

		// Try standard module load
		try {
			logger.info(`[DEBUG] Attempting standard module loading`);
			const standardModule = await loadModule(filePath);
			logger.info(`[DEBUG] Standard module result type: ${typeof standardModule}`);

			if (standardModule) {
				if (typeof standardModule === 'object') {
					logger.info(`[DEBUG] Standard module keys: ${Object.keys(standardModule as object).join(', ')}`);
				} else if (typeof standardModule === 'function') {
					logger.info(`[DEBUG] Standard module is a function`);

					try {
						const instance = new (standardModule as new () => unknown)();
						logger.info(`[DEBUG] Instantiated function: ${(instance as Record<string, unknown>)?.constructor?.name || 'Unknown'}`);
						logger.info(`[DEBUG] Instance keys: ${Object.keys(instance as object).join(', ')}`);
					} catch (err) {
						logger.error(`[DEBUG] Failed to instantiate function: ${err instanceof Error ? err.message : String(err)}`);
					}
				}
			}
		} catch (err) {
			logger.error(`[DEBUG] Standard module loading failed: ${err instanceof Error ? err.message : String(err)}`);
		}

		// Final report
		logger.info(`[DEBUG] Module loading test complete for ${filePath}`);
	} catch (err) {
		logger.error(`[DEBUG] Debug module loading failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}
