import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../services/logger';

export default abstract class Command {
	abstract get name(): string;
	abstract get description(): string;
	abstract get data(): Partial<SlashCommandBuilder>;

	protected async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		logger.debug(`Executing command ${this.name} for user ${interaction.user.tag}`);
		try {
			await this.run(interaction);
			logger.debug(`Command ${this.name} executed successfully`);
		} catch (error) {
			logger.error(`Error executing command ${this.name}:`, error as Error);
			await this.handleError(interaction, error as Error);
		}
	}

	protected abstract run(interaction: ChatInputCommandInteraction): Promise<void>;

	protected async handleError(interaction: ChatInputCommandInteraction, error: Error): Promise<void> {
		logger.error(`Error in command ${this.name}:`, error);
		try {
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true
				});
				logger.debug(`Sent error response to user ${interaction.user.tag}`);
			} else if (interaction.deferred) {
				await interaction.editReply({
					content: 'There was an error while executing this command!'
				});
				logger.debug(`Updated deferred response with error for user ${interaction.user.tag}`);
			}
		} catch (replyError) {
			logger.error(`Failed to send error response for command ${this.name}:`, replyError as Error);
		}
	}

	protected async deferReply(interaction: ChatInputCommandInteraction, ephemeral: boolean = false): Promise<void> {
		logger.debug(`Deferring reply for command ${this.name}`);
		try {
			await interaction.deferReply({ ephemeral });
			logger.debug(`Reply deferred successfully for command ${this.name}`);
		} catch (error) {
			logger.error(`Failed to defer reply for command ${this.name}:`, error as Error);
			throw error;
		}
	}

	protected async sendReply(interaction: ChatInputCommandInteraction, content: string, ephemeral: boolean = false): Promise<void> {
		logger.debug(`Sending reply for command ${this.name}: "${content.substring(0, 100)}..."`);
		try {
			await interaction.reply({ content, ephemeral });
			logger.debug(`Reply sent successfully for command ${this.name}`);
		} catch (error) {
			logger.error(`Failed to send reply for command ${this.name}:`, error as Error);
			throw error;
		}
	}

	protected async editReply(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
		logger.debug(`Editing reply for command ${this.name}: "${content.substring(0, 100)}..."`);
		try {
			await interaction.editReply(content);
			logger.debug(`Reply edited successfully for command ${this.name}`);
		} catch (error) {
			logger.error(`Failed to edit reply for command ${this.name}:`, error as Error);
			throw error;
		}
	}
}
