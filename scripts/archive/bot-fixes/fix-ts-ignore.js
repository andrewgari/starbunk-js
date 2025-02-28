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

	// Skip files that already have the correct format
	if (content.includes('// @ts-ignore')) {
		continue;
	}

	// Format the function signature with @ts-ignore
	const newContent = content.replace(
		/export default function create(\w+)Bot\(webhookServiceParam: WebhookService = webhookService\): ReplyBot/g,
		'export default function create$1Bot(\n\t// @ts-ignore - parameter kept for test compatibility but not used\n\twebhookServiceParam: WebhookService = webhookService\n): ReplyBot'
	);

	// Only write if changes were made
	if (newContent !== content) {
		// Remove any existing eslint-disable comments
		let finalContent = newContent.replace(
			/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n/g,
			''
		);

		fs.writeFileSync(filePath, finalContent, 'utf8');
	}
}
