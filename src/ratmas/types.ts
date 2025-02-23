export interface RatmasParticipant {
	userId: string;
	wishlistUrl?: string;
	assignedTargetId?: string;
}

export interface RatmasEvent {
	channelId: string;
	startDate: Date;
	openingDate: Date;
	participants: Map<string, RatmasParticipant>;
	isActive: boolean;
}
