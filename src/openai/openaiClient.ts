import OpenAI from 'openai';
import { config } from '../config/botConfig';

if (!process.env.OPENAI_KEY) {
  throw new Error('OPENAI_KEY environment variable is not set');
}

export const OpenAIClient = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
  timeout: 10000,
  maxRetries: 3
});
