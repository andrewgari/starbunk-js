import { inferTriggerCondition } from '../triggerConditionUtils';

describe('inferTriggerCondition', () => {
	it('should infer direct_mention from trigger names containing "mention"', () => {
		expect(inferTriggerCondition('user-mention-trigger')).toBe('direct_mention');
		expect(inferTriggerCondition('MENTION_HANDLER')).toBe('direct_mention');
	});

	it('should infer direct_mention from trigger names containing "@"', () => {
		expect(inferTriggerCondition('@-trigger')).toBe('direct_mention');
		expect(inferTriggerCondition('handle-@-symbol')).toBe('direct_mention');
	});

	it('should infer direct_mention from trigger names containing "direct"', () => {
		expect(inferTriggerCondition('direct-message')).toBe('direct_mention');
		expect(inferTriggerCondition('DIRECT_TRIGGER')).toBe('direct_mention');
	});

	it('should infer llm_decision from trigger names containing "llm"', () => {
		expect(inferTriggerCondition('llm-response')).toBe('llm_decision');
		expect(inferTriggerCondition('LLM_HANDLER')).toBe('llm_decision');
	});

	it('should infer random_chance from trigger names containing "random"', () => {
		expect(inferTriggerCondition('random-trigger')).toBe('random_chance');
		expect(inferTriggerCondition('RANDOM_RESPONSE')).toBe('random_chance');
	});

	it('should infer random_chance from trigger names containing "chance"', () => {
		expect(inferTriggerCondition('chance-based')).toBe('random_chance');
		expect(inferTriggerCondition('CHANCE_TRIGGER')).toBe('random_chance');
	});

	it('should infer command from trigger names containing "command"', () => {
		expect(inferTriggerCondition('command-handler')).toBe('command');
		expect(inferTriggerCondition('COMMAND_TRIGGER')).toBe('command');
	});

	it('should infer command from trigger names containing "stats"', () => {
		expect(inferTriggerCondition('stats-command')).toBe('command');
		expect(inferTriggerCondition('STATS_HANDLER')).toBe('command');
	});

	it('should infer keyword_match from trigger names containing "keyword"', () => {
		expect(inferTriggerCondition('keyword-trigger')).toBe('keyword_match');
		expect(inferTriggerCondition('KEYWORD_HANDLER')).toBe('keyword_match');
	});

	it('should return default condition for unrecognized trigger names', () => {
		expect(inferTriggerCondition('unknown-trigger')).toBe('pattern_match');
		expect(inferTriggerCondition('some-other-trigger')).toBe('pattern_match');
	});

	it('should use custom default condition when provided', () => {
		expect(inferTriggerCondition('unknown-trigger', 'command')).toBe('command');
		expect(inferTriggerCondition('some-other-trigger', 'keyword_match')).toBe('keyword_match');
	});

	it('should be case-insensitive', () => {
		expect(inferTriggerCondition('MENTION')).toBe('direct_mention');
		expect(inferTriggerCondition('Mention')).toBe('direct_mention');
		expect(inferTriggerCondition('MeNtIoN')).toBe('direct_mention');
	});

	it('should prioritize earlier matches when multiple keywords are present', () => {
		// "mention" is checked before "command"
		expect(inferTriggerCondition('mention-command')).toBe('direct_mention');
		// "llm" is checked before "keyword"
		expect(inferTriggerCondition('llm-keyword')).toBe('llm_decision');
	});
});
