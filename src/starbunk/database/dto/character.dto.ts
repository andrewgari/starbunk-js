export interface CreateCharacterDto {
	name: string;
	avatarUrl?: string;
	playerId: string;
	campaignId: string;
}

export interface UpdateCharacterDto {
	name?: string;
	avatarUrl?: string;
}
