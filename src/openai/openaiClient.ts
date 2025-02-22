import OpenAI from 'openai';

const openaikey = process.env.OPENAI_KEY!;

export const OpenAIClient = new OpenAI({
	apiKey: openaikey,
});
