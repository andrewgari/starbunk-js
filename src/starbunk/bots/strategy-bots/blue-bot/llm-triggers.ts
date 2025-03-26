import { or } from '../../core/conditions';
import { createLLMCondition } from '../../core/llm-conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { BLUE_BOT_PATTERNS } from './constants';
import { blueMentionTrigger } from './triggers';

// Enhanced version of blue mention trigger with LLM
export const blueMentionLLMTrigger = createTriggerResponse({
	name: 'blue-mention-llm',
	priority: 1,
	condition: or(
		// Original regex condition
		blueMentionTrigger.condition,
		// LLM-enhanced detection
		createLLMCondition(
			'Does this message mention or refer to "blu"?',
			BLUE_BOT_PATTERNS.Default
		)
	),
	response: blueMentionTrigger.response,
	identity: blueMentionTrigger.identity
});
