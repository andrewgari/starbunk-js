import { createBot } from '../../createBot';

// Create the Baby Bot that responds with Metroid gif using the simplified approach
export default createBot({
	name: 'BabyBot',
	description: 'Posts a Metroid gif when someone mentions "baby"',
	patterns: [/\bbaby\b/i],
	responses: ['https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'],
	avatarUrl: 'https://i.redd.it/qc9qus78dc581.jpg',
	skipBotMessages: true
});
