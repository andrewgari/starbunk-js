import { Command } from '../../discord/command';
import { logger } from '../../services/logger';

/**
 * This utility helps convert between different command formats
 * It handles both class-based and object-based command exports
 */
export function createCommandAdapter(commandObj: unknown): Command | null {
	if (!commandObj || typeof commandObj !== 'object') {
		return null;
	}

	// Use type guard to check if it has the required properties
	const obj = commandObj as Partial<Command>;
	if (obj.data && obj.execute && typeof obj.execute === 'function') {
		return commandObj as Command;
	}

	return null;
}

/**
 * Try to import a command module and adapt it to the Command interface
 */
export async function importAndAdaptCommand(modulePath: string): Promise<Command | null> {
	try {
		const commandModule = await import(modulePath);

		// Handle class exports
		if (commandModule.default && typeof commandModule.default === 'function') {
			try {
				const CommandClass = commandModule.default;
				const command = new CommandClass();
				return createCommandAdapter(command);
			} catch (error) {
				logger.error(`Error instantiating command class from ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}
		// Handle object exports
		else if (commandModule.default && typeof commandModule.default === 'object') {
			return createCommandAdapter(commandModule.default);
		}

		return null;
	} catch (error) {
		logger.error(`Error importing command module from ${modulePath}:`, error instanceof Error ? error : new Error(String(error)));
		return null;
	}
}
