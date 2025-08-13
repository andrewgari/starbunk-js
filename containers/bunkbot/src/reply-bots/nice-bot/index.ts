import { createBot } from '../../createBot';
import { NICE_BOT_AVATAR_URL, NICE_BOT_NAME, NICE_BOT_PATTERNS, NICE_BOT_RESPONSES } from './constants';

// Create the Nice Bot using the simplified API
export default createBot({
	name: NICE_BOT_NAME,
	description: 'Responds with "Nice." to specific numbers',
	patterns: [NICE_BOT_PATTERNS.Default],
	responses: [NICE_BOT_RESPONSES.Default],
	avatarUrl: NICE_BOT_AVATAR_URL
});
