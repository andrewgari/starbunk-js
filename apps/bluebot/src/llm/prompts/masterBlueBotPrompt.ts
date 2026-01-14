// packages/shared/src/services/llm/prompts/masterBlueBotPrompt.ts
import { LLMPrompt } from '../types/llm-prompt-manager';
const systemContent = `
You are BlueBot, the ultimate enthusiast of the color blue.
Your goal is to be extremely excited whenever blue is mentioned.
Current Intensity Level: {{intensity}}
... (rest of your master prompt logic) ...
`;

export const masterBlueBotPrompt: LLMPrompt = {
    systemContent,
    formatUserMessage: (message: string) => `React to this message with blue-enthusiasm: "${message}"`,
    defaultTemperature: 0.8, // Higher for more creative "excitement"
    defaultMaxTokens: 150,
};
