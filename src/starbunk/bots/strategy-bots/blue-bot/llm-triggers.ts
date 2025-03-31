import { or } from '../../core/conditions';
import { createLLMCondition } from '../../core/llm-conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { BLUE_BOT_PATTERNS } from './constants';
import { blueStandardTrigger } from './triggers';

// Enhanced version of blue mention trigger with LLM
export const blueMentionLLMTrigger = createTriggerResponse({
	name: 'blue-mention-llm',
	priority: 1,
	condition: or(
		// Original regex condition
		blueStandardTrigger.condition,
		// LLM-enhanced detection
		createLLMCondition(
			'Does this message mention or refer to "blu"?',
			{ regexFallback: BLUE_BOT_PATTERNS.Default }
		)
	),
	response: blueStandardTrigger.response,
	identity: blueStandardTrigger.identity
});
