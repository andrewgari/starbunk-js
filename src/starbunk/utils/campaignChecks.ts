import { GuildMember } from 'discord.js';
import channelIds from '../../discord/channelIds';
import roleIds from '../../discord/roleIds';
import { CampaignService } from '../services/campaignService';

export interface CampaignContext {
	campaign: 'hotsprings' | 'madmage' | 'testing' | null;
	isGM: boolean;
	isPlayer: boolean;
	isValidChannel: boolean;
	isTestingChannel: boolean;
}

export interface CampaignPermissions {
	canAccessGMContent: boolean;
	canCreateNotes: boolean;
	canManageCampaign: boolean;
	canManageSessions: boolean;
	campaignId: string | null;
}

export function getCampaignContext(member: GuildMember, channelId: string): CampaignContext {
	// Check if we're in the testing channel
	const isTestingChannel = channelId === channelIds.Starbunk.StarbunkTesting;

	// In testing channel, allow access to both campaigns for testing
	if (isTestingChannel) {
		const hasAnyGMRole = member.roles.cache.has(roleIds.HotSpringsGM) ||
			member.roles.cache.has(roleIds.MadMageGM);
		const hasAnyPlayerRole = hasAnyGMRole || member.roles.cache.has(roleIds.HotSpringsPlayer) ||
			member.roles.cache.has(roleIds.MadMagePlayer);

		return {
			campaign: 'testing',
			isGM: hasAnyGMRole,
			isPlayer: hasAnyPlayerRole,
			isValidChannel: true,
			isTestingChannel: true
		};
	}

	// Regular campaign channel logic
	let campaign: 'hotsprings' | 'madmage' | 'testing' | null = null;
	if (channelId === channelIds.Campaigns.HotSprings) {
		campaign = 'hotsprings';
	} else if (channelId === channelIds.Campaigns.MadMage) {
		campaign = 'madmage';
	}

	// Check roles specific to the current channel's campaign
	const isGM = campaign === 'hotsprings' ?
		member.roles.cache.has(roleIds.HotSpringsGM) :
		campaign === 'madmage' ?
			member.roles.cache.has(roleIds.MadMageGM) :
			false;

	const isPlayer = campaign === 'hotsprings' ?
		member.roles.cache.has(roleIds.HotSpringsPlayer) :
		campaign === 'madmage' ?
			member.roles.cache.has(roleIds.MadMagePlayer) :
			false;

	return {
		campaign,
		isGM,
		isPlayer,
		isValidChannel: campaign !== null,
		isTestingChannel: false
	};
}

export async function getCampaignPermissions(context: CampaignContext): Promise<CampaignPermissions> {
	// In testing channel, allow access to both campaigns
	if (context.isTestingChannel) {
		return {
			canAccessGMContent: context.isGM,
			canCreateNotes: true, // Allow all note creation in testing
			canManageCampaign: context.isGM,
			canManageSessions: context.isGM,
			campaignId: 'testing' // Special testing campaign ID
		};
	}

	// Get the actual campaign ID from the database
	const campaignService = CampaignService.getInstance();
	const campaigns = await campaignService.getActiveCampaigns();
	const campaign = campaigns.find(c =>
		(context.campaign === 'hotsprings' && c.channelId === channelIds.Campaigns.HotSprings) ||
		(context.campaign === 'madmage' && c.channelId === channelIds.Campaigns.MadMage)
	);

	return {
		canAccessGMContent: context.isGM,
		canCreateNotes: context.isGM || context.isPlayer,
		canManageCampaign: context.isGM,
		canManageSessions: context.isGM,
		campaignId: campaign?.id || null
	};
}

export function validateCampaignAccess(member: GuildMember, channelId: string): string | null {
	const context = getCampaignContext(member, channelId);

	// Always allow access in testing channel if user has any campaign role
	if (context.isTestingChannel) {
		if (!context.isGM && !context.isPlayer) {
			return 'You need a campaign role to use this command, even in testing.';
		}
		return null;
	}

	// Regular channel validation
	if (!context.isValidChannel) {
		return 'This command can only be used in campaign channels.';
	}

	if (!context.isGM && !context.isPlayer) {
		return 'You do not have permission to use this command in this campaign.';
	}

	return null;
}
