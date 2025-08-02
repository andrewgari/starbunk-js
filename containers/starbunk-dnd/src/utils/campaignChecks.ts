import { GuildMember } from 'discord.js';

/**
 * Campaign context interface
 */
export interface CampaignContext {
	member: GuildMember;
	channelId: string;
	guildId: string;
	userId: string;
}

/**
 * Campaign permissions interface
 */
export interface CampaignPermissions {
	canCreate: boolean;
	canManage: boolean;
	canView: boolean;
	canParticipate: boolean;
}

/**
 * Get campaign context from member and channel
 */
export function getCampaignContext(member: GuildMember, channelId: string): CampaignContext {
	return {
		member,
		channelId,
		guildId: member.guild.id,
		userId: member.id
	};
}

/**
 * Get campaign permissions for the given context
 */
export async function getCampaignPermissions(context: CampaignContext): Promise<CampaignPermissions> {
	// Basic permissions - can be extended later
	const isAdmin = context.member.permissions.has('Administrator');
	const isManageChannels = context.member.permissions.has('ManageChannels');
	
	return {
		canCreate: isAdmin || isManageChannels,
		canManage: isAdmin || isManageChannels,
		canView: true, // Everyone can view
		canParticipate: true // Everyone can participate
	};
}
