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
	let needsUpdate = false;

	// Check if the file imports WebhookService but doesn't use it in the function signature
	if (content.includes('import webhookService, { WebhookService }') &&
		!content.includes('webhookServiceParam:')) {
		content = content.replace(
			/import webhookService, { WebhookService } from ['"](.*)['"];/g,
			'import webhookService from \'$1\';'
		);
		needsUpdate = true;
	}

	// Check if the function doesn't accept parameters but needs to for tests
	if (content.includes('export default function create') &&
		!content.includes('(webhookServiceParam:') &&
		!content.includes('(config:')) {

		// Extract the bot name from the function
		const match = content.match(/function create([A-Za-z]+)Bot\(\)/);
		if (match) {
			// Add the parameter to the function signature
			content = content.replace(
				/function create([A-Za-z]+)Bot\(\)/g,
				'function create$1Bot(webhookServiceParam: WebhookService = webhookService)'
			);

			// Make sure WebhookService is imported
			if (!content.includes('{ WebhookService }')) {
				content = content.replace(
					/import webhookService from ['"](.*)['"];/g,
					'import webhookService, { WebhookService } from \'$1\';'
				);
			}

			needsUpdate = true;
		}
	}

	// Save changes if needed
	if (needsUpdate) {
		fs.writeFileSync(filePath, content, 'utf8');
	}
}
