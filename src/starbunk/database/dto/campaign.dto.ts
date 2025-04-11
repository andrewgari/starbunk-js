import { GameSystem } from '../../types/game';

export interface CreateCampaignDto {
	id?: string;
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId?: string;
	gmId: string;
	guildId: string;
	adventureId?: string;
	isActive: boolean;
	roleId?: string;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> { }
