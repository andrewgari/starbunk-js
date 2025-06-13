import { createBot } from '../../createBot';

export default createBot({
	name: 'ExampleBot',
	description: 'An example bot created with the simplified approach',
	patterns: [/\bexample\b/i, /\bsimple\b/i],
	responses: ['This is an example response from the simplified bot architecture!'],
	avatarUrl: 'https://example.com/avatar.png',
	responseRate: 100
});
