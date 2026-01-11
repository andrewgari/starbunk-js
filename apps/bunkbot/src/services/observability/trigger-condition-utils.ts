import type { BotResponseLog } from './bot-response-logger';

/**
 * Infer trigger condition type from trigger name
 * Uses string matching on trigger names to determine the condition type
 *
 * @param triggerName - The name of the trigger
 * @param defaultCondition - Default condition if no match is found (default: 'pattern_match')
 * @returns The inferred trigger condition type
 */
export function inferTriggerCondition(
	triggerName: string,
	defaultCondition: BotResponseLog['trigger_condition'] = 'pattern_match',
): BotResponseLog['trigger_condition'] {
	const lowerName = triggerName.toLowerCase();

	if (lowerName.includes('mention') || lowerName.includes('@') || lowerName.includes('direct')) {
		return 'direct_mention';
	}

	if (lowerName.includes('llm')) {
		return 'llm_decision';
	}

	if (lowerName.includes('random') || lowerName.includes('chance')) {
		return 'random_chance';
	}

	if (lowerName.includes('command') || lowerName.includes('stats')) {
		return 'command';
	}

	if (lowerName.includes('keyword')) {
		return 'keyword_match';
	}

	return defaultCondition;
}
