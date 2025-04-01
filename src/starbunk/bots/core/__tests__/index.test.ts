import * as coreIndex from '../index';

describe('core index module', () => {
	it('should export all expected modules', () => {
		// Check that all components are exported
		expect(coreIndex).toMatchObject({
			// From conditions
			matchesPattern: expect.any(Function),
			containsWord: expect.any(Function),
			containsPhrase: expect.any(Function),
			fromUser: expect.any(Function),
			inChannel: expect.any(Function),
			withChance: expect.any(Function),
			fromBot: expect.any(Function),
			and: expect.any(Function),
			or: expect.any(Function),
			not: expect.any(Function),
			
			// From responses
			staticResponse: expect.any(Function),
			randomResponse: expect.any(Function),
			templateResponse: expect.any(Function),
			regexCaptureResponse: expect.any(Function),
			sendBotResponse: expect.any(Function),
			
			// From trigger-response
			createTriggerResponse: expect.any(Function),
			
			// From bot-builder
			createStrategyBot: expect.any(Function),
			
			// From llm-conditions
			createLLMCondition: expect.any(Function)
		});
	});
});