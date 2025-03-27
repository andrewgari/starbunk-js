import { logger } from '../../services/logger';
import { Campaign, GameContent } from '../types/game';
import { LLMQueryService } from './llmQueryService';
import { NoteService } from './noteService';

interface GameContentSource {
	content: string;
	category: string;
	tags: string[];
}

export class GameContentService {
	private static instance: GameContentService;
	private content: Map<string, GameContent>;
	private noteService: NoteService;
	private llmQueryService: LLMQueryService;

	private constructor() {
		this.content = new Map();
		this.noteService = NoteService.getInstance();
		this.llmQueryService = LLMQueryService.getInstance();
	}

	public static getInstance(): GameContentService {
		if (!GameContentService.instance) {
			GameContentService.instance = new GameContentService();
		}
		return GameContentService.instance;
	}

	public async addContent(
		campaign: Campaign,
		content: string,
		tags: string[],
		isGMOnly: boolean,
		userId: string,
		systemData?: Record<string, unknown>
	): Promise<GameContent> {
		const item: GameContent = {
			id: `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			campaignId: campaign.id,
			content,
			tags,
			isGMOnly,
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			systemData
		};

		this.content.set(item.id, item);
		logger.info(`Added game content: ${item.id} for campaign ${campaign.name}`);
		return item;
	}

	public getContent(id: string): GameContent | undefined {
		return this.content.get(id);
	}

	public getCampaignContent(
		campaignId: string,
		options: {
			isGM: boolean;
			tags?: string[];
			searchText?: string;
		}
	): GameContent[] {
		return Array.from(this.content.values())
			.filter(item => {
				// Filter by campaign
				if (item.campaignId !== campaignId) return false;

				// Filter GM-only content
				if (item.isGMOnly && !options.isGM) return false;

				// Filter by tags if specified
				if (options.tags?.length) {
					if (!options.tags.some(tag => item.tags.includes(tag))) return false;
				}

				// Filter by search text if specified
				if (options.searchText) {
					const searchLower = options.searchText.toLowerCase();
					const contentLower = item.content.toLowerCase();
					const tagsLower = item.tags.map(t => t.toLowerCase());

					if (!contentLower.includes(searchLower) &&
						!tagsLower.some(t => t.includes(searchLower))) {
						return false;
					}
				}

				return true;
			})
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	public async updateContent(
		id: string,
		updates: Partial<Omit<GameContent, 'id' | 'campaignId' | 'createdBy' | 'createdAt'>>
	): Promise<GameContent> {
		const item = this.getContent(id);
		if (!item) {
			throw new Error(`Content not found: ${id}`);
		}

		const updatedItem = {
			...item,
			...updates,
			updatedAt: new Date()
		};

		this.content.set(id, updatedItem);
		logger.info(`Updated game content: ${id}`);
		return updatedItem;
	}

	public async deleteContent(id: string): Promise<void> {
		const item = this.content.get(id);
		if (!item) {
			throw new Error(`Content not found: ${id}`);
		}

		this.content.delete(id);
		logger.info(`Deleted game content: ${id}`);
	}

	public async searchContent(
		searchText: string,
		campaign: Campaign,
		isGM: boolean
	): Promise<GameContent[]> {
		return this.getCampaignContent(campaign.id, {
			isGM,
			searchText
		});
	}

	public async addNote(params: {
		campaignId: string;
		adventureId: string;
		content: string;
		userId: string;
		isGM: boolean;
		tags?: string[];
	}) {
		return this.noteService.addNote({
			...params,
			tags: params.tags || []
		});
	}

	public async queryGameContext(
		campaign: Campaign,
		query: string,
		userId: string,
		isGM: boolean
	): Promise<{
		answer: string;
		sources: GameContentSource[];
	}> {
		return this.llmQueryService.queryGameContext(campaign, query, userId, isGM);
	}
}
