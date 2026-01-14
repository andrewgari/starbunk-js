import { LLMMessage } from "./llm-message";

export interface LLMCompletionOptions {
  model?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  provider?: string;
}
