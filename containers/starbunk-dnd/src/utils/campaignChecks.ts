// Campaign validation utilities for D&D features
import { logger } from '@starbunk/shared';

export interface CampaignValidationResult {
	isValid: boolean;
	errors: string[];
}

export function validateCampaignData(data: unknown): CampaignValidationResult {
	const errors: string[] = [];

	if (!data) {
		errors.push('Campaign data is required');
	}

	if (data && !data.name) {
		errors.push('Campaign name is required');
	}

	if (data && !data.id) {
		errors.push('Campaign ID is required');
	}

	const isValid = errors.length === 0;

	if (!isValid) {
		logger.warn('Campaign validation failed', { errors });
	}

	return {
		isValid,
		errors
	};
}

export function validatePlayerCharacter(character: unknown): CampaignValidationResult {
	const errors: string[] = [];

	if (!character) {
		errors.push('Character data is required');
	}

	if (character && !character.name) {
		errors.push('Character name is required');
	}

	if (character && !character.class) {
		errors.push('Character class is required');
	}

	const isValid = errors.length === 0;

	return {
		isValid,
		errors
	};
}

export interface CampaignContext {
	member: unknown;
	channelId: string;
}

export interface CampaignPermissions {
	canManageCampaign: boolean;
	campaignId: string | null;
}

export function getCampaignContext(interaction: unknown): CampaignContext {
	return {
		member: interaction.member,
		channelId: interaction.channelId || 'default'
	};
}

export async function getCampaignPermissions(_userId: string, _channelId: string): Promise<CampaignPermissions> {
	// Simple permission check - in a real implementation this would check database
	return {
		canManageCampaign: true,
		campaignId: 'campaign123'
	};
}
