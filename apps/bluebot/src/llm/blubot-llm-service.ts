import { LLMService } from './llm-service';
import { LLMCompletionOptions } from './types/llm-completion-options';
import { LLMCompletionResponse } from './types/llm-completion-response';


export class BlueBotLLMService implements LLMService {
  private static instance: BlueBotLLMService;
  private provider: LLMService;

  private constructor(provider: LLMService) {
    this.provider = provider;
  }

  public static getInstance(provider: LLMService): BlueBotLLMService {
    if (!BlueBotLLMService.instance) {
      BlueBotLLMService.instance = new BlueBotLLMService(provider);
    }
    return BlueBotLLMService.instance;
  }

  public async initialize(): Promise<boolean> {
    return await this.provider.initialize();
  }

  public isInitialized(): boolean {
    return this.provider.isInitialized();
  }

  public getProviderName(): string {
    return this.provider.getProviderName();
  }

  public getAvailableModels(): string[] {
    return this.provider.getAvailableModels();
  }

  public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    return await this.provider.createCompletion(options);
  }

  public async createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    return await this.provider.createSimpleCompletion(prompt, systemPrompt);
  }
}
