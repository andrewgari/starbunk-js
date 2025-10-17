// Shared Discord utilities for all containers
import {
	Client,
	CommandInteraction,
	ChatInputCommandInteraction,
	GuildMember,
	User,
	Guild,
	Interaction,
} from 'discord.js';
import { logger } from '../services/logger';

// Type alias for any command interaction type
type AnyCommandInteraction = CommandInteraction | ChatInputCommandInteraction;

/**
 * Safely get a Discord client from an interaction
 * This replaces container-specific getStarbunkClient functions
 */
export function getClientFromInteraction(interaction: AnyCommandInteraction): Client {
	return interaction.client;
}

/**
 * Safely get guild member from interaction
 */
export function getMemberFromInteraction(interaction: AnyCommandInteraction): GuildMember | null {
	if (!interaction.guild || !interaction.member) {
		return null;
	}
	// Only return if it's a full GuildMember object, not API data
	return interaction.member instanceof GuildMember ? interaction.member : null;
}

/**
 * Safely get user from interaction
 */
export function getUserFromInteraction(interaction: AnyCommandInteraction): User {
	return interaction.user;
}

/**
 * Safely get guild from interaction
 */
export function getGuildFromInteraction(interaction: AnyCommandInteraction): Guild | null {
	return interaction.guild;
}

/**
 * Check if user is in a voice channel
 */
export function isUserInVoiceChannel(member: GuildMember): boolean {
	return !!member.voice.channel;
}

/**
 * Get user's voice channel
 */
export function getUserVoiceChannel(member: GuildMember) {
	return member.voice.channel;
}

/**
 * Validate that interaction is from a guild (not DM)
 */
export function validateGuildInteraction(interaction: AnyCommandInteraction): boolean {
	if (!interaction.guild) {
		logger.warn('Command attempted in DM, rejecting');
		return false;
	}
	return true;
}

/**
 * Common error response for interactions
 */
export async function sendErrorResponse(
	interaction: AnyCommandInteraction,
	message: string = 'An error occurred while processing your command.',
): Promise<void> {
	try {
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: `❌ ${message}`, ephemeral: true });
		} else {
			await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
		}
	} catch (error) {
		logger.error('Failed to send error response:', error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Common success response for interactions
 */
export async function sendSuccessResponse(interaction: AnyCommandInteraction, message: string): Promise<void> {
	try {
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: `✅ ${message}`, ephemeral: false });
		} else {
			await interaction.reply({ content: `✅ ${message}`, ephemeral: false });
		}
	} catch (error) {
		logger.error('Failed to send success response:', error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Defer interaction reply for long-running operations
 */
export async function deferInteractionReply(
	interaction: AnyCommandInteraction,
	ephemeral: boolean = false,
): Promise<void> {
	try {
		if (!interaction.replied && !interaction.deferred) {
			await interaction.deferReply({ ephemeral });
		}
	} catch (error) {
		logger.error('Failed to defer interaction reply:', error instanceof Error ? error : new Error(String(error)));
	}
}
