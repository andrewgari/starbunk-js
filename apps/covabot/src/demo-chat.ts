#!/usr/bin/env node

/**
 * Simple demo script to test the CovaBot chat functionality
 */

import { CovaBot } from './cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from './cova-bot/triggers';
// import { logger } from '@starbunk/shared';

async function demoChat() {
	console.log('🤖 CovaBot Chat Demo');
	console.log('===================\n');

	// Initialize CovaBot
	const covaBot = new CovaBot({
		name: 'CovaBot',
		description: 'LLM-powered CovaBot for demo testing',
		defaultIdentity: {
			botName: 'Cova',
			avatarUrl: '/static/cova-avatar.png',
		},
		triggers: [covaStatsCommandTrigger, covaDirectMentionTrigger, covaTrigger],
	});

	console.log(`✅ CovaBot initialized: ${covaBot.name}`);
	console.log(`📝 Description: ${covaBot.description}`);
	console.log(`⚙️  Metadata:`, covaBot.metadata);
	console.log('');

	// Test messages
	const testMessages = [
		'Hello CovaBot!',
		'How are you doing today?',
		'What is your name?',
		'Tell me something interesting',
		'Can you help me?',
		'What do you think about AI?',
		'Goodbye!',
	];

	console.log('🧪 Testing chat responses...\n');

	for (let i = 0; i < testMessages.length; i++) {
		const message = testMessages[i];
		console.log(`👤 User: ${message}`);

		try {
			const response = await covaBot.processWebMessage(message);

			if (response) {
				console.log(`🤖 CovaBot: ${response}`);
			} else {
				console.log(`🤖 CovaBot: *chose not to respond*`);
			}
		} catch (error) {
			console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
		}

		console.log(''); // Empty line for readability

		// Small delay between messages
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	console.log('✅ Demo completed!');
	console.log('\n💡 To test the web interface:');
	console.log('   1. Run: npm run start:web');
	console.log('   2. Open: http://localhost:7080');
	console.log('   3. Click on "Test Chat" tab');
	console.log('   4. Start chatting with CovaBot!');
}

// Run the demo
if (require.main === module) {
	demoChat().catch((error) => {
		console.error('Demo failed:', error);
		process.exit(1);
	});
}

export { demoChat };
