import { logger, ensureError, MessageFilter } from '@starbunk/shared';
import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

export interface Command {
	data: SlashCommandBuilder | RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute(interaction: CommandInteraction): Promise<void>;
}

export class InteractionHandler {
	constructor(
		private messageFilter: MessageFilter,
		private readonly commands: Map<string, Command>,
	) {}

	async handleInteraction(interaction: CommandInteraction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		try {
			if (!this.shouldProcessInteraction(interaction)) {
				await this.sendFilteredResponse(interaction);
				return;
			}

			await this.executeCommand(interaction);
		} catch (error) {
			logger.error(`Error handling interaction:`, ensureError(error));
			await this.sendErrorResponse(interaction);
		}
	}

	private shouldProcessInteraction(interaction: CommandInteraction): boolean {
		const context = MessageFilter.createContextFromInteraction(interaction);
		const _result = this.messageFilter.shouldProcessMessage(context);

		if (!result.allowed) {
			logger.debug(`Interaction filtered: ${result.reason}`);
		}

		return result.allowed;
	}

	private async sendFilteredResponse(interaction: CommandInteraction): Promise<void> {
		const message = this.messageFilter.isDebugMode()
			? '🚫 Command filtered in debug mode'
			: '🚫 This command is not available in this server/channel.';

		await interaction.reply({ content: message, ephemeral: true });
	}

	private async executeCommand(interaction: CommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName);

		if (!command) {
			await this.sendUnknownCommandResponse(interaction);
			return;
		}

		logger.info(`Executing command: ${interaction.commandName}`);
		await command.execute(interaction);
		logger.debug(`Command completed: ${interaction.commandName}`);
	}

	private async sendUnknownCommandResponse(interaction: CommandInteraction): Promise<void> {
		const availableCommands = Array.from(this.commands.keys())
			.map((cmd) => `\`${cmd}\``)
			.join(', ');

		await interaction.reply({
			content: `❓ Unknown command: \`${interaction.commandName}\`\nAvailable: ${availableCommands}`,
			ephemeral: true,
		});
	}

	private async sendErrorResponse(interaction: CommandInteraction): Promise<void> {
		try {
			if (interaction.replied || interaction.deferred) {
				logger.error('Command failed after interaction was already handled - cannot send error response');
				return;
			}

			await interaction.reply({
				content: '❌ An error occurred while processing the command.',
				ephemeral: true,
			});
		} catch (replyError) {
			logger.error('Failed to send error response:', ensureError(replyError));
		}
	}
}
