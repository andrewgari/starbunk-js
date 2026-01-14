import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { BLUE_BOT_RESPONSES } from '../constants';
import { BLUE_BOT_DECEPTIVE_CHECK_PROMPT } from '../llm/prompts';
export class BlueBotService {
	private static instance: BlueBotService;
	private llmService: LLMService;

	private constructor(llmService: LLMService) {
		this.llmService = llmService;
	}

		public static getInstance(llmService: LLMService): BlueBotService {
			if (!BlueBotService.instance) {
				BlueBotService.instance = new BlueBotService(llmService);
			}
			return BlueBotService.instance;
		}

		public async initialize(): Promise<void> {
			// Avoid double-initializing the underlying provider if it was already
			// initialized by the factory.
			if (!this.llmService.isInitialized()) {
				await this.llmService.initialize();
			}
		}

			public async processMessage(message: Message): Promise<void> {
				// First, ask the LLM (using the DeceptiveCheck system prompt) whether the
				// incoming message is about blue / Blue Mage, including deceptive cases.
				const detection = await this.llmService.createSimpleCompletion(
					BLUE_BOT_DECEPTIVE_CHECK_PROMPT.formatUserMessage(message.content),
					BLUE_BOT_DECEPTIVE_CHECK_PROMPT.systemContent,
				);

				const normalized = detection.trim().toLowerCase();
				if (normalized !== 'yes') {
					// Not a blue-related message (or the model was unsure) – do nothing.
					return;
				}

				// For now, keep the response simple and deterministic: when the LLM
				// detects a blue reference, respond with the default Blu line.
				await this.respond(message, BLUE_BOT_RESPONSES.Default);
			}

		public async respond(message: Message, response: string): Promise<void> {
			await message.reply(response);
		}
}
