import OpenAI from 'openai';
import { Logger } from '../services/logger';
import { Service, ServiceId } from '../services/services';

@Service({
	id: ServiceId.OpenAIClient,
	dependencies: [ServiceId.Logger],
	scope: 'singleton'
})
export class OpenAIClient extends OpenAI {
	constructor(private logger: Logger) {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			logger.error('OpenAI API key not found in environment variables');
			throw new Error('OpenAI API key not found in environment variables');
		}

		super({ apiKey });
		this.logger.debug('OpenAI client initialized');
	}
}
