import { createBot } from '../../createBot';
import { ATTITUDE_BOT_AVATAR_URL, ATTITUDE_BOT_NAME, ATTITUDE_BOT_PATTERNS, ATTITUDE_BOT_RESPONSES } from './constants';

// Create the Attitude Bot using the simplified API
export default createBot({
	name: ATTITUDE_BOT_NAME,
	description: 'Responds to negative statements with "Well, not with THAT attitude!!!"',
	patterns: [ATTITUDE_BOT_PATTERNS.Default],
	responses: [ATTITUDE_BOT_RESPONSES.Default],
	avatarUrl: ATTITUDE_BOT_AVATAR_URL
});
