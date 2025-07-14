// Service container for starbunk-dnd
export enum ServiceId {
	DiscordService = 'DiscordService',
	CampaignService = 'CampaignService',
	CharacterService = 'CharacterService',
	GameSessionService = 'GameSessionService'
}

class Container {
	private services = new Map<string, any>();

	register<T>(serviceId: ServiceId, instance: T): void {
		this.services.set(serviceId, instance);
	}

	get<T>(serviceId: ServiceId): T {
		const service = this.services.get(serviceId);
		if (!service) {
			throw new Error(`Service not registered: ${serviceId}`);
		}
		return service;
	}

	has(serviceId: ServiceId): boolean {
		return this.services.has(serviceId);
	}

	clear(): void {
		this.services.clear();
	}
}

export const container = new Container();
