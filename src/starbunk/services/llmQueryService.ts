import { logger } from '../../services/logger';
import { AdventureMetadata } from '../types/adventure';
import { Campaign } from '../types/game';
import { StorageItem } from '../types/storage';
import { AdventureService } from './adventureService';
import { CampaignService } from './campaignService';
import { GameLLMService } from './llmService';
import { NoteService } from './noteService';
import { StorageService } from './storageService';

export class LLMQueryService {
	private static instance: LLMQueryService;
	private storageService: StorageService;
	private adventureService: AdventureService;
	private campaignService: CampaignService;
	private noteService: NoteService;
	private llmService: GameLLMService;

	private constructor() {
		this.storageService = StorageService.getInstance();
		this.adventureService = AdventureService.getInstance();
		this.campaignService = CampaignService.getInstance();
		this.noteService = NoteService.getInstance();
		this.llmService = GameLLMService.getInstance();
	}

	public static getInstance(): LLMQueryService {
		if (!LLMQueryService.instance) {
			LLMQueryService.instance = new LLMQueryService();
		}
		return LLMQueryService.instance;
	}

	public async queryGameContext(
		campaign: Campaign,
		query: string,
		userId: string,
		isGM: boolean
	): Promise<{
		answer: string;
		sources: Array<{
			content: string;
			category: string;
			tags: string[];
		}>;
	}> {
		logger.info(`[LLMQueryService] Starting query for campaign "${campaign.name}" by user ${userId}. Query: "${query}"`);
		try {
			// Search for relevant notes
			logger.debug(`[LLMQueryService] Searching for relevant notes...`);
			const relevantNotes = await this.noteService.searchNotes(campaign, query, { isGM });
			logger.debug(`[LLMQueryService] Found ${relevantNotes.length} relevant notes`);

			// Build context from relevant notes if any exist
			let context = '';
			if (relevantNotes.length > 0) {
				logger.debug(`[LLMQueryService] Building context from notes...`);
				context = relevantNotes
					.map(note => {
						logger.debug(`[LLMQueryService] Processing note: ${JSON.stringify(note)}`);
						return `[${note.category.toUpperCase()}] ${note.content}`;
					})
					.join('\n\n');
				logger.debug(`[LLMQueryService] Built context length: ${context.length} characters`);
			}

			// Get answer from LLM (will use system knowledge if no context available)
			logger.debug(`[LLMQueryService] Requesting answer from LLM service...`);
			const answer = await this.llmService.answerQuestion(query, context, isGM, campaign);
			logger.debug(`[LLMQueryService] Received answer from LLM service`);

			const response = {
				answer,
				sources: relevantNotes.map(note => ({
					content: note.content,
					category: note.category,
					tags: note.tags
				}))
			};
			logger.info(`[LLMQueryService] Successfully generated response for query`);
			return response;
		} catch (error) {
			logger.error('[LLMQueryService] Error in queryGameContext:', error instanceof Error ? error : new Error(String(error)));
			logger.info('[LLMQueryService] Error context:', {
				campaignId: campaign.id,
				query,
				userId,
				isGM
			});
			if (error instanceof Error) {
				logger.error('[LLMQueryService] Error details:', error);
			}
			throw new Error('Failed to query game context');
		}
	}

	private buildSystemPrompt(
		campaign: Campaign,
		adventure: AdventureMetadata,
		isGM: boolean
	): string {
		return `You are a helpful assistant for the "${campaign.name}" campaign, ` +
			`which is running "${adventure.name}" using ${campaign.system.name} ${campaign.system.version}.\n\n` +
			`You can ONLY answer questions using the provided campaign context. ` +
			`Do not make up or infer information not explicitly stated in the context.\n\n` +
			`You ${isGM ? 'are' : 'are not'} speaking to the GM. ` +
			`Never reveal GM-only information to non-GM users.\n\n` +
			`When answering questions, stay focused on the specific campaign and adventure context. ` +
			`Do not provide general RPG advice or rules explanations unless they are specifically ` +
			`mentioned in the provided context.`;
	}

	private buildContentContext(items: StorageItem[]): string {
		return items
			.map(item => {
				const header = `--- ${item.path.category.toUpperCase()} (${item.metadata.tags.join(', ')}) ---`;
				return `${header}\n${item.content}\n`;
			})
			.join('\n');
	}
}
