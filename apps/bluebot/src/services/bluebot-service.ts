import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { BLUE_BOT_RESPONSES } from '../constants';
import { buildBlueBotPrompt, PromptType } from '../llm/prompts';
import { LLMMessage } from '../llm/types/llm-message';
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
				// 1) Detection pass: master prompt + detector prompt.
				const detectionPrompt = buildBlueBotPrompt(
					PromptType.BlueDetector,
					message.content,
				);
				const detectionMessages: LLMMessage[] = [
					{ role: 'system', content: detectionPrompt.systemPrompt },
					{ role: 'user', content: detectionPrompt.userPrompt },
				];
				const detectionResponse = await this.llmService.createCompletion({
					messages: detectionMessages,
					temperature: detectionPrompt.temperature,
					maxTokens: detectionPrompt.maxTokens,
				});
				const detection = detectionResponse.content;

				const normalized = detection.trim().toLowerCase();
				if (normalized !== 'yes') {
					// Not a blue-related message (or the model was unsure) – do nothing.
					return;
				}

				// 2) Strategy pass: master prompt + strategy prompt.
				const strategyPrompt = buildBlueBotPrompt(
					PromptType.BlueStrategy,
					message.content,
				);
				const strategyMessages: LLMMessage[] = [
					{ role: 'system', content: strategyPrompt.systemPrompt },
					{ role: 'user', content: strategyPrompt.userPrompt },
				];
				let reply: string;
				try {
					const strategyResponse = await this.llmService.createCompletion({
						messages: strategyMessages,
						temperature: strategyPrompt.temperature,
						maxTokens: strategyPrompt.maxTokens,
					});
					reply = strategyResponse.content;
				} catch {
					// Fallback to a simple canned response if the strategy call fails.
					reply = BLUE_BOT_RESPONSES.Default;
				}

				await this.respond(message, reply);
			}

		public async respond(message: Message, response: string): Promise<void> {
			await message.reply(response);
		}
}
