const fs = require('fs');
const path = require('path');

const BOT_DIR = path.join(__dirname, 'src', 'starbunk', 'bots', 'reply-bots');

// Get all .ts files in the bot directory except blueBot.ts
const botFiles = fs.readdirSync(BOT_DIR)
	.filter(file => file.endsWith('.ts') && file !== 'blueBot.ts');

console.log(`Found ${botFiles.length} bot files to fix...`);

// Fix each bot
let fixedCount = 0;
for (const file of botFiles) {
	const filePath = path.join(BOT_DIR, file);
	const content = fs.readFileSync(filePath, 'utf8');

	// Only process files that still use the webhookServiceParam in the BotBuilder constructor
	if (content.includes('webhookServiceParam') && content.includes('new BotBuilder')) {
		// Check if this file passes webhookServiceParam to BotBuilder
		const botBuilderPattern = /new\s+BotBuilder\s*\(\s*['"][\w]+['"]\s*,\s*webhookServiceParam\s*\)/;
		if (botBuilderPattern.test(content)) {
			console.log(`Fixing ${file}...`);

			// Replace the constructor parameter with webhookService
			let fixedContent = content.replace(
				/new\s+BotBuilder\s*\(\s*(['"][\w]+['"]\s*),\s*webhookServiceParam\s*\)/g,
				'new BotBuilder($1, webhookService)'
			);

			// Add the explanatory comment before the return statement if not already there
			if (!fixedContent.includes('// Always use the imported singleton webhookService')) {
				fixedContent = fixedContent.replace(
					/(return\s+)new\s+BotBuilder/,
					'$1// Always use the imported singleton webhookService, ignoring any webhookService in config\n\t// This ensures we\'re using the properly initialized webhookService with the writeMessage method\n\tnew BotBuilder'
				);
			}

			// Write the fixed content back to the file
			fs.writeFileSync(filePath, fixedContent, 'utf8');
			fixedCount++;
		}
	}
}

console.log(`Fixed ${fixedCount} bot files successfully!`);
