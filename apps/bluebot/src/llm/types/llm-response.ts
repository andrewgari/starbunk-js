export interface LLMResponse {
	text: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
}
