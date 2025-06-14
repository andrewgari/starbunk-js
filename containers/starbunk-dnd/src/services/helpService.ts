import { logger } from '@starbunk/shared';
import { VectorService } from './vectorService';

interface HelpContent {
	title: string;
	description: string;
	command: string;
	category: 'campaign' | 'game' | 'session';
	isGMOnly: boolean;
	examples: string[];
	tips: string[];
}

export class HelpService {
	private static instance: HelpService;
	private vectorService: VectorService;
	private helpContent: HelpContent[];

	private constructor() {
		this.vectorService = VectorService.getInstance();
		this.helpContent = [
			{
				title: 'Campaign Creation',
				description: 'Create and manage TTRPG campaigns',
				command: '/rpg campaign create',
				category: 'campaign',
				isGMOnly: true,
				examples: [
					'/rpg campaign create name:"Lost Mines" system:"dnd5e"',
					'/rpg campaign create name:"Cyberpunk RED" system:"cyberpunk"'
				],
				tips: [
					'Choose a descriptive name for your campaign',
					'Make sure to select the correct game system'
				]
			},
			{
				title: 'Note Taking',
				description: 'Add and manage campaign notes with automatic categorization',
				command: '/rpg game note',
				category: 'game',
				isGMOnly: false,
				examples: [
					'/rpg game note content:"Met a mysterious merchant named Galadriel" tags:"npc,quest"',
					'/rpg game note content:"Found ancient ruins in the forest" tags:"location,quest"'
				],
				tips: [
					'Use tags to organize your notes',
					'Notes are automatically categorized by the AI',
					'Players can mark notes as GM-only if they contain sensitive information'
				]
			},
			{
				title: 'Session Scheduling',
				description: 'Schedule and manage game sessions',
				command: '/rpg session schedule',
				category: 'session',
				isGMOnly: true,
				examples: [
					'/rpg session schedule date:"2024-04-01 19:00" description:"Boss battle!"',
					'/rpg session schedule date:"2024-04-15 18:30" description:"Character creation session"'
				],
				tips: [
					'Use 24-hour format for time',
					'Add a description to help players prepare',
					'Schedule sessions well in advance'
				]
			},
			{
				title: 'Game Questions',
				description: 'Ask questions about the game system or campaign',
				command: '/rpg game ask',
				category: 'game',
				isGMOnly: false,
				examples: [
					'/rpg game ask question:"How does sneak attack work?"',
					'/rpg game ask question:"What happened in the last session?"'
				],
				tips: [
					'Be specific with your questions',
					'The AI uses context from your campaign notes',
					'GMs can use /rpg game ask-gm for questions about GM-only content'
				]
			}
		];
	}

	public static getInstance(): HelpService {
		if (!HelpService.instance) {
			HelpService.instance = new HelpService();
		}
		return HelpService.instance;
	}

	public async initialize(): Promise<void> {
		try {
			// Generate embeddings for help content
			await this.vectorService.generateVectorsFromTexts(
				'help',
				this.helpContent.map(content => ({
					text: `${content.title}\n${content.description}\n${content.examples.join('\n')}`,
					metadata: {
						file: content.command,
						is_gm_content: content.isGMOnly,
						chunk_size: 1024,
						category: content.category,
						isGMOnly: content.isGMOnly,
						command: content.command
					}
				}))
			);
			logger.info('[HelpService] Help content vectors generated successfully');
		} catch (error) {
			logger.error('[HelpService] Error generating help content vectors:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to initialize help content');
		}
	}

	public async getRelevantHelp(query: string, isGM: boolean): Promise<HelpContent[]> {
		try {
			const results = await this.vectorService.findSimilarTexts('help', query, { limit: 3 });

			return results
				.map(result => {
					// Use the file property which contains the command
					const content = this.helpContent.find(h =>
						h.command === (result.metadata as any).command || h.command === result.metadata.file
					);
					return content;
				})
				.filter((content): content is HelpContent =>
					content !== undefined && (isGM || !content.isGMOnly)
				);
		} catch (error) {
			logger.error('[HelpService] Error getting relevant help:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	public formatHelpContent(content: HelpContent[]): string {
		if (content.length === 0) {
			return "No relevant help content found. Try using `/rpg` for a complete command list.";
		}

		return content.map(item => [
			`📖 **${item.title}**`,
			item.description,
			"",
			"**Command:** `" + item.command + "`",
			"",
			"**Examples:**",
			...item.examples.map(ex => `• \`${ex}\``),
			"",
			"**Tips:**",
			...item.tips.map(tip => `• ${tip}`),
			""
		].join('\n')).join('\n');
	}
}
