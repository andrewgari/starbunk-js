// Backward-compatible re-exports from the new modular commands package
export type { Command } from './commands/command';
export { CommandRegistry } from './commands/command-registry';
export { deployCommands } from './commands/deploy';
export { setupCommandHandlers } from './commands/handlers';
export { initializeCommands } from './commands/initialize';
