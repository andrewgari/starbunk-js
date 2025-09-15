import { logger } from '@starbunk/shared';
import { ADVENTURES, AdventureMetadata, Location, NPC } from '../types/adventure';
import { Campaign } from '../types/game';

export class AdventureService {
	private static instance: AdventureService;
	private locations: Map<string, Location>;
	private npcs: Map<string, NPC>;
	private campaignAdventures: Map<string, string>; // campaignId -> adventureId

	private constructor() {
		this.locations = new Map();
		this.npcs = new Map();
		this.campaignAdventures = new Map();
	}

	public static getInstance(): AdventureService {
		if (!AdventureService.instance) {
			AdventureService.instance = new AdventureService();
		}
		return AdventureService.instance;
	}

	public async setAdventureForCampaign(
		campaign: Campaign,
		adventureId: keyof typeof ADVENTURES,
	): Promise<AdventureMetadata> {
		const adventure = ADVENTURES[adventureId];
		if (!adventure) {
			throw new Error(`Adventure not found: ${adventureId}`);
		}

		// Verify system compatibility
		if (adventure.system.id !== campaign.system.id) {
			throw new Error(
				`Adventure ${adventure.name} is for ${adventure.system.name} ${adventure.system.version}, ` +
					`but campaign is using ${campaign.system.name} ${campaign.system.version}`,
			);
		}

		this.campaignAdventures.set(campaign.id, adventureId);
		logger.info(`Set adventure ${adventure.name} for campaign ${campaign.name}`);
		return adventure;
	}

	public getAdventureForCampaign(campaignId: string): AdventureMetadata | undefined {
		const adventureId = this.campaignAdventures.get(campaignId);
		return adventureId ? ADVENTURES[adventureId as keyof typeof ADVENTURES] : undefined;
	}

	public async addLocation(campaignId: string, location: Omit<Location, 'id'>): Promise<Location> {
		const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newLocation: Location = {
			...location,
			id,
		};

		this.locations.set(id, newLocation);
		logger.info(`Added location ${id}: ${location.name}`);
		return newLocation;
	}

	public async addNPC(campaignId: string, npc: Omit<NPC, 'id'>): Promise<NPC> {
		const id = `npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newNPC: NPC = {
			...npc,
			id,
		};

		this.npcs.set(id, newNPC);
		logger.info(`Added NPC ${id}: ${npc.name}`);
		return newNPC;
	}

	public getLocations(campaignId: string, options: { isGM: boolean }): Location[] {
		return Array.from(this.locations.values()).filter((loc) => {
			if (loc.isGMOnly && !options.isGM) return false;
			return true;
		});
	}

	public getNPCs(campaignId: string, options: { isGM: boolean }): NPC[] {
		return Array.from(this.npcs.values()).filter((npc) => {
			if (npc.isGMOnly && !options.isGM) return false;
			return true;
		});
	}

	public getLocation(id: string, options: { isGM: boolean }): Location | undefined {
		const location = this.locations.get(id);
		if (!location || (location.isGMOnly && !options.isGM)) {
			return undefined;
		}
		return location;
	}

	public getNPC(id: string, options: { isGM: boolean }): NPC | undefined {
		const npc = this.npcs.get(id);
		if (!npc || (npc.isGMOnly && !options.isGM)) {
			return undefined;
		}
		return npc;
	}
}
