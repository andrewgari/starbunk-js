// Repository factory for starbunk-dnd
import { CampaignRepository, CharacterRepository, GameSessionRepository } from '../../domain/repositories';

// Mock implementations for testing
class MockCampaignRepository implements CampaignRepository {
	private campaigns = new Map();

	async create(data: any) {
		const campaign = { id: 'test-id', ...data, createdAt: new Date(), updatedAt: new Date() };
		this.campaigns.set(campaign.id, campaign);
		return campaign;
	}

	async findById(id: string) {
		return this.campaigns.get(id) || null;
	}

	async findByUserId(userId: string) {
		return Array.from(this.campaigns.values()).filter((c: any) => c.dmUserId === userId);
	}

	async findByChannelId(channelId: string) {
		return Array.from(this.campaigns.values()).filter((c: any) => c.channelId === channelId);
	}

	async update(id: string, updates: any) {
		const campaign = this.campaigns.get(id);
		if (!campaign) return null;
		Object.assign(campaign, updates, { updatedAt: new Date() });
		return campaign;
	}

	async delete(id: string) {
		return this.campaigns.delete(id);
	}

	async getMetadata(id: string) {
		const campaign = this.campaigns.get(id);
		if (!campaign) return null;
		return {
			id: campaign.id,
			name: campaign.name,
			gameSystem: campaign.gameSystem,
			playerCount: campaign.playerUserIds?.length || 0,
			isActive: campaign.isActive
		};
	}
}

class MockCharacterRepository implements CharacterRepository {
	private characters = new Map();

	async create(data: any) {
		const character = { id: 'test-char-id', ...data, createdAt: new Date(), updatedAt: new Date() };
		this.characters.set(character.id, character);
		return character;
	}

	async findById(id: string) {
		return this.characters.get(id) || null;
	}

	async findByUserId(userId: string) {
		return Array.from(this.characters.values()).filter((c: any) => c.userId === userId);
	}

	async findByCampaignId(campaignId: string) {
		return Array.from(this.characters.values()).filter((c: any) => c.campaignId === campaignId);
	}

	async update(id: string, updates: any) {
		const character = this.characters.get(id);
		if (!character) return null;
		Object.assign(character, updates, { updatedAt: new Date() });
		return character;
	}

	async delete(id: string) {
		return this.characters.delete(id);
	}
}

class MockGameSessionRepository implements GameSessionRepository {
	private sessions = new Map();

	async create(data: any) {
		const session = { id: 'test-session-id', ...data, createdAt: new Date(), updatedAt: new Date() };
		this.sessions.set(session.id, session);
		return session;
	}

	async findById(id: string) {
		return this.sessions.get(id) || null;
	}

	async findByCampaignId(campaignId: string) {
		return Array.from(this.sessions.values()).filter((s: any) => s.campaignId === campaignId);
	}

	async update(id: string, updates: any) {
		const session = this.sessions.get(id);
		if (!session) return null;
		Object.assign(session, updates, { updatedAt: new Date() });
		return session;
	}

	async delete(id: string) {
		return this.sessions.delete(id);
	}
}

export class RepositoryFactory {
	static createCampaignRepository(): CampaignRepository {
		return new MockCampaignRepository();
	}

	static createCharacterRepository(): CharacterRepository {
		return new MockCharacterRepository();
	}

	static createGameSessionRepository(): GameSessionRepository {
		return new MockGameSessionRepository();
	}
}
