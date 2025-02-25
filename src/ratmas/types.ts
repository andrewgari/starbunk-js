export interface RatmasParticipant {
	userId: string;
	wishlistUrl?: string;
	assignedTargetId?: string;
}

export interface RatmasEvent {
	channelId: string;
	guildId: string;
	eventId: string;
	startDate: Date;
	openingDate: Date;
	participants: [string, RatmasParticipant][];
	isActive: boolean;
	year: number;
}

// For persistence
export interface SerializedRatmasEvent {
	channelId: string;
	guildId: string;
	eventId: string;
	startDate: string;
	openingDate: string;
	participants: Array<[string, RatmasParticipant]>;
	isActive: boolean;
	year: number;
}
