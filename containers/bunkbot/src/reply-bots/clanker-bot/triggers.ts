import { createTriggerResponse } from '../../core/trigger-response';
import { containsWord } from '../../core/conditions';
import { CLANKER_BOT_RESPONSES } from './constants';

export const clankerTrigger = createTriggerResponse({
	name: 'clanker-word-trigger',
	priority: 1,
	condition: containsWord('clanker'),
	response: () => CLANKER_BOT_RESPONSES[Math.floor(Math.random() * CLANKER_BOT_RESPONSES.length)],
});
