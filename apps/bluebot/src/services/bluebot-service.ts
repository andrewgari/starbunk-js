import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
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
    await this.llmService.initialize();
  }

  public async processMessage(message: Message): Promise<void> {
    const prompt = `Consider if the following message is talking about the color blue. If it is, responsd with "Did somebody say blu?". Be sure to consider deception, and if a person say "red" in place of blue, that would also trigger.`
    const response = await this.llmService.createSimpleCompletion(prompt);
    await this.respond(message, response);
  }

  public async respond(message: Message, response: string): Promise<void> {
    await message.reply(response);
  }
}
