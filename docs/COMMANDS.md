# Command System Documentation

This document explains how to create and implement slash commands for the Discord bot.

## Overview

The bot uses Discord.js slash commands to provide interactive functionality. Commands are structured into categories and automatically registered with Discord when the bot starts.

## Quick Start

1. Create a new file in `src/starbunk/commands/` with your command name (e.g., `pingCommand.ts`)
2. Use the template below
3. Register the command in `src/starbunk/commands/index.ts`
4. Restart the bot service

## Basic Command Template

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const pingCommand: Command = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),

	async execute(interaction) {
		try {
			await interaction.reply('Pong!');
		} catch (error) {
			Logger.error('Error in ping command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Command with Options

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const greetCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('greet')
		.setDescription('Greets a user')
		.addUserOption((option) => option.setName('user').setDescription('The user to greet').setRequired(true))
		.addStringOption((option) =>
			option
				.setName('style')
				.setDescription('The greeting style')
				.setRequired(false)
				.addChoices(
					{ name: 'Formal', value: 'formal' },
					{ name: 'Casual', value: 'casual' },
					{ name: 'Enthusiastic', value: 'enthusiastic' },
				),
		),

	async execute(interaction) {
		try {
			const user = interaction.options.getUser('user', true);
			const style = interaction.options.getString('style') || 'casual';

			let greeting;
			switch (style) {
				case 'formal':
					greeting = `Good day, ${user.username}.`;
					break;
				case 'enthusiastic':
					greeting = `HEY THERE ${user.username}!!! SO GREAT TO SEE YOU! 🎉🎉🎉`;
					break;
				case 'casual':
				default:
					greeting = `Hey ${user.username}! What's up?`;
					break;
			}

			await interaction.reply(greeting);
		} catch (error) {
			Logger.error('Error in greet command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Command Registration

Add your command to the collection in `src/starbunk/commands/index.ts`:

```typescript
// ... existing imports
import { pingCommand } from './pingCommand';
import { greetCommand } from './greetCommand';

// ... existing code
export const commands: Collection<string, Command> = new Collection([
	// ... existing commands
	['ping', pingCommand],
	['greet', greetCommand],
]);
```

## Command Types

The bot supports several types of commands:

1. **Basic Commands** - Simple interactions like ping/pong
2. **Admin Commands** - Commands with permission restrictions
3. **Music Commands** - Commands for audio playback
4. **Fun Commands** - Entertainment commands like jokes or games
5. **Utility Commands** - Helper functions like user info or server stats

## Option Types

Discord.js supports these common option types:

- `addStringOption` - Text input
- `addIntegerOption` - Whole number input
- `addNumberOption` - Decimal number input
- `addBooleanOption` - True/false input
- `addUserOption` - User selection
- `addChannelOption` - Channel selection
- `addRoleOption` - Role selection
- `addMentionableOption` - User or role selection
- `addAttachmentOption` - File attachment

## Command with Subcommands

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const configCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Configure bot settings')
		.addSubcommand((subcommand) => subcommand.setName('view').setDescription('View current configuration'))
		.addSubcommand((subcommand) =>
			subcommand
				.setName('set')
				.setDescription('Set a configuration value')
				.addStringOption((option) =>
					option
						.setName('key')
						.setDescription('The configuration key')
						.setRequired(true)
						.addChoices({ name: 'Prefix', value: 'prefix' }, { name: 'Welcome Message', value: 'welcome' }),
				)
				.addStringOption((option) => option.setName('value').setDescription('The new value').setRequired(true)),
		),

	async execute(interaction) {
		try {
			const subcommand = interaction.options.getSubcommand();

			switch (subcommand) {
				case 'view':
					await interaction.reply('Current configuration: ...');
					break;
				case 'set':
					const key = interaction.options.getString('key', true);
					const value = interaction.options.getString('value', true);
					// Save configuration...
					await interaction.reply(`Updated ${key} to "${value}"`);
					break;
				default:
					await interaction.reply({
						content: 'Unknown subcommand',
						ephemeral: true,
					});
			}
		} catch (error) {
			Logger.error('Error in config command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Commands with Permissions

```typescript
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const kickCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kick a user from the server')
		.addUserOption((option) => option.setName('user').setDescription('The user to kick').setRequired(true))
		.addStringOption((option) =>
			option.setName('reason').setDescription('The reason for kicking').setRequired(false),
		)
		// Set permissions at the command definition level
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

	async execute(interaction) {
		try {
			// You can also check permissions in the handler
			if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
				return interaction.reply({
					content: 'You do not have permission to use this command',
					ephemeral: true,
				});
			}

			const user = interaction.options.getUser('user', true);
			const reason = interaction.options.getString('reason') || 'No reason provided';

			// Check if the user is kickable
			const member = await interaction.guild?.members.fetch(user.id);
			if (!member || !member.kickable) {
				return interaction.reply({
					content: 'I cannot kick this user',
					ephemeral: true,
				});
			}

			// Perform the kick
			await member.kick(reason);
			await interaction.reply(`Kicked ${user.username} for reason: ${reason}`);
		} catch (error) {
			Logger.error('Error in kick command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Deferred Replies

For commands that might take more than 3 seconds to complete:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const searchCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for information')
		.addStringOption((option) => option.setName('query').setDescription('What to search for').setRequired(true)),

	async execute(interaction) {
		try {
			// Defer the reply to avoid timeout errors
			await interaction.deferReply();

			// Perform a time-consuming operation
			const results = await someTimeConsumingSearch(interaction.options.getString('query', true));

			// Now reply with the results
			await interaction.editReply(`Search results: ${results}`);
		} catch (error) {
			Logger.error('Error in search command:', error as Error);

			// Check if we've already deferred
			if (interaction.deferred) {
				await interaction.editReply('An error occurred during the search');
			} else {
				await interaction.reply({
					content: 'An error occurred during the search',
					ephemeral: true,
				});
			}
		}
	},
};
```

## Ephemeral Replies

For private responses only visible to the command user:

```typescript
await interaction.reply({
	content: 'This message is only visible to you',
	ephemeral: true,
});
```

## Testing Commands

Test your commands in `src/__tests__/starbunk/commands/`:

```typescript
import { commandName } from '../../../starbunk/commands/commandName';

// Create a mock interaction
const mockInteraction = {
	reply: jest.fn(),
	options: {
		getUser: jest.fn(),
		getString: jest.fn(),
		getInteger: jest.fn(),
		getSubcommand: jest.fn(),
	},
};

describe('Command Name', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should reply with the expected message', async () => {
		// Arrange
		mockInteraction.options.getString.mockReturnValue('test value');

		// Act
		await commandName.execute(mockInteraction);

		// Assert
		expect(mockInteraction.reply).toHaveBeenCalledWith(expect.stringContaining('expected response'));
	});

	it('should handle errors gracefully', async () => {
		// Arrange
		mockInteraction.options.getString.mockImplementation(() => {
			throw new Error('Test error');
		});

		// Act
		await commandName.execute(mockInteraction);

		// Assert
		expect(mockInteraction.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('error occurred'),
				ephemeral: true,
			}),
		);
	});
});
```

## Command Cooldowns

To prevent command spam, implement cooldowns:

```typescript
import { SlashCommandBuilder, Collection } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

// Cooldown tracking
const cooldowns = new Collection<string, Collection<string, number>>();

export const spamCommand: Command = {
	data: new SlashCommandBuilder().setName('spam').setDescription('A command with cooldown'),

	async execute(interaction) {
		try {
			// Cooldown in seconds
			const cooldownAmount = 5;

			// Setup cooldown for this command if it doesn't exist
			if (!cooldowns.has(this.data.name)) {
				cooldowns.set(this.data.name, new Collection());
			}

			const now = Date.now();
			const timestamps = cooldowns.get(this.data.name)!;
			const userId = interaction.user.id;

			if (timestamps.has(userId)) {
				const expirationTime = timestamps.get(userId)! + cooldownAmount * 1000;

				if (now < expirationTime) {
					const timeLeft = (expirationTime - now) / 1000;
					return interaction.reply({
						content: `Please wait ${timeLeft.toFixed(1)} more seconds before using the ${this.data.name} command again.`,
						ephemeral: true,
					});
				}
			}

			timestamps.set(userId, now);
			setTimeout(() => timestamps.delete(userId), cooldownAmount * 1000);

			// Execute the command
			await interaction.reply('Command executed!');
		} catch (error) {
			Logger.error('Error in spam command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Command Groups and Categories

Organize commands into directories by category:

```
src/starbunk/commands/
  ├── index.ts           # Command registration
  ├── command.ts         # Command interface
  ├── admin/             # Admin commands
  │   ├── kickCommand.ts
  │   └── banCommand.ts
  ├── general/           # General commands
  │   ├── pingCommand.ts
  │   └── helpCommand.ts
  ├── music/             # Music commands
  │   ├── playCommand.ts
  │   └── stopCommand.ts
  └── fun/               # Fun commands
      ├── jokeCommand.ts
      └── 8ballCommand.ts
```

## Command Autocompletion

For commands with dynamic choices:

```typescript
import { SlashCommandBuilder, AutocompleteInteraction } from 'discord.js';
import { Command } from './command';
import { Logger } from '../../services/logger';

export const playlistCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('Play a saved playlist')
		.addStringOption((option) =>
			option.setName('name').setDescription('The playlist name').setRequired(true).setAutocomplete(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		try {
			const focusedValue = interaction.options.getFocused();
			const playlists = ['Pop Hits', 'Rock Classics', 'EDM Party', 'Chill Vibes'];

			const filtered = playlists.filter((playlist) =>
				playlist.toLowerCase().includes(focusedValue.toLowerCase()),
			);

			await interaction.respond(filtered.map((playlist) => ({ name: playlist, value: playlist })));
		} catch (error) {
			Logger.error('Error in playlist autocomplete:', error as Error);
		}
	},

	async execute(interaction) {
		try {
			const playlistName = interaction.options.getString('name', true);
			// Play the selected playlist...
			await interaction.reply(`Playing playlist: ${playlistName}`);
		} catch (error) {
			Logger.error('Error in playlist command:', error as Error);
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true,
			});
		}
	},
};
```

## Tips & Best Practices

1. **Error Handling**: Always use try/catch blocks to handle errors gracefully
2. **Validation**: Validate inputs to prevent unexpected behavior
3. **Permissions**: Check permissions before performing sensitive operations
4. **Response Types**: Use ephemeral responses for private messages and errors
5. **Feedback**: Always provide feedback to the user after command execution
6. **Documentation**: Keep the description fields clear and helpful
7. **Testing**: Write tests for all commands to ensure they work as expected
8. **Separation of Concerns**: Keep command logic separate from business logic
9. **Consistent Style**: Follow a consistent naming convention and structure
10. **Progressive Enhancement**: Start with simple commands and gradually add features
