const fs = require('fs');
const path = require('path');

const BOT_DIR = path.join(__dirname, 'src', 'starbunk', 'bots', 'reply-bots');

// Get all .ts files in the bot directory except blueBot.ts
const botFiles = fs.readdirSync(BOT_DIR)
	.filter(file => file.endsWith('.ts') && file !== 'blueBot.ts');

// Process each bot file
for (const file of botFiles) {
	const filePath = path.join(BOT_DIR, file);
	let content = fs.readFileSync(filePath, 'utf8');

	// Check if the file has a webhookServiceParam that's not used
	if (content.includes('webhookServiceParam: WebhookService') &&
		!content.includes('@ts-ignore') &&
		!content.includes('// eslint-disable-next-line')) {

		// Add eslint-disable-next-line comment before function declaration
		content = content.replace(
			/(export default function create\w+Bot\()/g,
			'// eslint-disable-next-line @typescript-eslint/no-unused-vars\n$1'
		);

		fs.writeFileSync(filePath, content, 'utf8');
	}
}
